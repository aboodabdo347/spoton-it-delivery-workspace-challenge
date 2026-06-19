import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Release, DeploymentStatus } from './release.entity';
import { WorkItem } from '../it-workspace/work-item.entity';
import { ItWorkspaceService } from '../it-workspace/it-workspace.service';
import { ScoreService } from '../score/score.service';
import { CreateReleaseDto } from './dto/create-release.dto';
import { UpdateReleaseDto } from './dto/update-release.dto';
import { LinkItemsDto } from './dto/link-items.dto';
import type { RequestUser } from '../common/request-user';

export type ReleaseWithItems = Release & { linkedWorkItems: WorkItem[] };

@Injectable()
export class ReleaseService {
  constructor(
    @InjectRepository(Release)
    private readonly releaseRepo: Repository<Release>,
    @InjectRepository(WorkItem)
    private readonly workItemRepo: Repository<WorkItem>,
    private readonly itWorkspaceService: ItWorkspaceService,
    private readonly scoreService: ScoreService,
  ) {}

  async create(dto: CreateReleaseDto): Promise<Release> {
    const release = this.releaseRepo.create({
      version: dto.version,
      releaseDate: dto.releaseDate ?? null,
      summary: dto.summary ?? null,
      deploymentStatus: 'draft' as DeploymentStatus,
      linkedWorkItemIds: [],
    });
    return this.releaseRepo.save(release) as Promise<Release>;
  }

  async findAll(): Promise<ReleaseWithItems[]> {
    const releases = await this.releaseRepo.find({ order: { createdAt: 'DESC' } });
    return Promise.all(releases.map((r) => this.populate(r)));
  }

  async findOne(id: string): Promise<ReleaseWithItems> {
    const release = await this.releaseRepo.findOne({ where: { id } });
    if (!release) throw new NotFoundException(`Release ${id} not found`);
    return this.populate(release);
  }

  async update(id: string, dto: UpdateReleaseDto): Promise<ReleaseWithItems> {
    const release = await this.getRaw(id);

    if (release.deploymentStatus === 'deployed') {
      throw new BadRequestException('A deployed release cannot be modified.');
    }

    if (dto.version !== undefined) release.version = dto.version;
    if (dto.releaseDate !== undefined) release.releaseDate = dto.releaseDate ?? null;
    if (dto.summary !== undefined) release.summary = dto.summary ?? null;
    if (dto.deploymentStatus !== undefined) {
      release.deploymentStatus = dto.deploymentStatus as DeploymentStatus;
    }

    await this.releaseRepo.save(release);
    return this.populate(release);
  }

  async linkItems(id: string, dto: LinkItemsDto): Promise<ReleaseWithItems> {
    const release = await this.getRaw(id);

    if (release.deploymentStatus === 'deployed') {
      throw new BadRequestException('Cannot modify a deployed release.');
    }

    if (dto.workItemIds.length === 0) {
      release.linkedWorkItemIds = [];
      await this.releaseRepo.save(release);
      return this.populate(release);
    }

    const items = await this.workItemRepo.find({
      where: { id: In(dto.workItemIds) },
    });

    // Validate all requested IDs exist
    if (items.length !== dto.workItemIds.length) {
      const found = new Set(items.map((i) => i.id));
      const missing = dto.workItemIds.filter((id) => !found.has(id));
      throw new BadRequestException(`Work items not found: ${missing.join(', ')}`);
    }

    // Validate all are ready_for_release
    const notReady = items.filter((i) => i.status !== 'ready_for_release');
    if (notReady.length > 0) {
      throw new BadRequestException(
        `Only 'ready_for_release' items can be linked to a release. ` +
          `These items are not ready: ${notReady.map((i) => `"${i.title}" (${i.status})`).join(', ')}.`,
      );
    }

    release.linkedWorkItemIds = dto.workItemIds;
    await this.releaseRepo.save(release);
    return this.populate(release);
  }

  async deploy(id: string, user: RequestUser): Promise<ReleaseWithItems> {
    const release = await this.getRaw(id);

    // Idempotency guard — prevent double-deploy
    if (release.deploymentStatus === 'deployed') {
      throw new ConflictException('This release has already been deployed.');
    }

    if (release.deploymentStatus === 'rolled_back') {
      throw new BadRequestException('A rolled-back release cannot be deployed again.');
    }

    if (release.linkedWorkItemIds.length === 0) {
      throw new BadRequestException('Cannot deploy a release with no linked work items.');
    }

    release.deploymentStatus = 'deployed';
    await this.releaseRepo.save(release);

    // Mark all linked work items as released
    await this.itWorkspaceService.markAsReleased(release.linkedWorkItemIds);

    // Award deploy points — idempotent, so double-calling deploy won't re-award
    await this.scoreService.awardOnce(user.id, 'release_deployed', id, 3);

    return this.populate(release);
  }

  async remove(id: string): Promise<void> {
    const release = await this.getRaw(id);
    if (release.deploymentStatus === 'deployed') {
      throw new BadRequestException('A deployed release cannot be deleted.');
    }
    await this.releaseRepo.remove(release);
  }

  private async getRaw(id: string): Promise<Release> {
    const release = await this.releaseRepo.findOne({ where: { id } });
    if (!release) throw new NotFoundException(`Release ${id} not found`);
    return release;
  }

  private async populate(release: Release): Promise<ReleaseWithItems> {
    const ids = release.linkedWorkItemIds.filter(Boolean);
    const linkedWorkItems = ids.length
      ? await this.workItemRepo.find({ where: { id: In(ids) } })
      : [];
    return Object.assign(Object.create(release), release, { linkedWorkItems });
  }
}
