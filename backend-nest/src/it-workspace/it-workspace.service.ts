import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { WorkItem, WorkItemStatus, WorkItemType, WorkItemPriority } from './work-item.entity';
import { QaCheck, QaCheckStatus } from './qa-check.entity';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';
import { CreateQaCheckDto } from './dto/create-qa-check.dto';
import { UpdateQaCheckDto } from './dto/update-qa-check.dto';
import { ScoreService } from '../score/score.service';
import type { RequestUser } from '../common/request-user';

const ALLOWED_TRANSITIONS: Record<WorkItemStatus, WorkItemStatus[]> = {
  backlog: ['planned'],
  planned: ['backlog', 'in_progress'],
  in_progress: ['planned', 'qa'],
  qa: ['in_progress', 'ready_for_release'],
  ready_for_release: ['qa'],
  released: [],
};

@Injectable()
export class ItWorkspaceService {
  constructor(
    @InjectRepository(WorkItem)
    private readonly workItemRepo: Repository<WorkItem>,
    @InjectRepository(QaCheck)
    private readonly qaCheckRepo: Repository<QaCheck>,
    private readonly scoreService: ScoreService,
  ) {}

  // --- Work Items ---

  async create(dto: CreateWorkItemDto, user: RequestUser): Promise<WorkItem> {
    const item = this.workItemRepo.create({
      title: dto.title,
      description: dto.description ?? null,
      type: dto.type as WorkItemType,
      priority: dto.priority as WorkItemPriority,
      assignee: dto.assignee ?? null,
      dueDate: dto.dueDate ?? null,
      status: 'backlog' as WorkItemStatus,
      createdBy: user.id,
    });
    const saved = await this.workItemRepo.save(item) as WorkItem;

    await this.scoreService.awardOnce(user.id, 'work_item_created', saved.id, 1);

    return saved;
  }

  async findAll(query: {
    status?: WorkItemStatus;
    priority?: string;
    assignee?: string;
    search?: string;
    myWork?: string;
    userId?: string;
  }): Promise<WorkItem[]> {
    const where: FindOptionsWhere<WorkItem> = {};

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority as WorkItemPriority;
    if (query.assignee) where.assignee = query.assignee;
    if (query.myWork === 'true' && query.userId) {
      where.assignee = query.userId;
    }

    const items = await this.workItemRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });

    if (query.search) {
      const term = query.search.toLowerCase();
      return items.filter(
        (i) =>
          i.title.toLowerCase().includes(term) ||
          (i.description ?? '').toLowerCase().includes(term),
      );
    }

    return items;
  }

  async findOne(id: string): Promise<WorkItem> {
    const item = await this.workItemRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException(`Work item ${id} not found`);
    return item;
  }

  async update(id: string, dto: UpdateWorkItemDto, user: RequestUser): Promise<WorkItem> {
    const item = await this.findOne(id);

    const newStatus = dto.status as WorkItemStatus | undefined;
    if (newStatus && newStatus !== item.status) {
      this.assertAllowedTransition(item.status, newStatus);
      if (newStatus === 'ready_for_release') {
        await this.assertQaReady(id);
      }
    }

    if (dto.title !== undefined) item.title = dto.title;
    if (dto.description !== undefined) item.description = dto.description ?? null;
    if (dto.type !== undefined) item.type = dto.type as WorkItemType;
    if (dto.priority !== undefined) item.priority = dto.priority as WorkItemPriority;
    if (dto.assignee !== undefined) item.assignee = dto.assignee ?? null;
    if (dto.dueDate !== undefined) item.dueDate = dto.dueDate ?? null;
    if (newStatus !== undefined) item.status = newStatus;

    const saved = await this.workItemRepo.save(item) as WorkItem;

    // Award score for meaningful status transitions
    if (newStatus === 'qa') {
      await this.scoreService.awardOnce(user.id, 'work_item_moved_to_qa', id, 1);
    }
    if (newStatus === 'ready_for_release') {
      await this.scoreService.awardOnce(user.id, 'work_item_ready_for_release', id, 2);
    }

    return saved;
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
    await this.qaCheckRepo.delete({ workItemId: id });
    await this.workItemRepo.remove(item);
  }

  async summary() {
    const counts = await this.workItemRepo
      .createQueryBuilder('w')
      .select('w.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('w.status')
      .getRawMany<{ status: string; count: string }>();

    const byStatus = Object.fromEntries(
      counts.map((r) => [r.status, Number(r.count)]),
    );

    return {
      total: Object.values(byStatus).reduce((a, b) => a + b, 0),
      byStatus,
    };
  }

  async markAsReleased(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.workItemRepo
      .createQueryBuilder()
      .update(WorkItem)
      .set({ status: 'released' as WorkItemStatus })
      .whereInIds(ids)
      .execute();
  }

  // --- QA Checks ---

  async createQaCheck(workItemId: string, dto: CreateQaCheckDto): Promise<QaCheck> {
    await this.findOne(workItemId);
    const check = this.qaCheckRepo.create({
      workItemId,
      testTitle: dto.testTitle,
      expectedResult: dto.expectedResult,
      actualResult: dto.actualResult ?? null,
      status: 'pending' as QaCheckStatus,
      tester: dto.tester ?? null,
      notes: dto.notes ?? null,
    });
    return this.qaCheckRepo.save(check) as Promise<QaCheck>;
  }

  async listQaChecks(workItemId: string): Promise<QaCheck[]> {
    await this.findOne(workItemId);
    return this.qaCheckRepo.find({
      where: { workItemId },
      order: { createdAt: 'ASC' },
    });
  }

  async updateQaCheck(checkId: string, dto: UpdateQaCheckDto, user: RequestUser): Promise<QaCheck> {
    const check = await this.qaCheckRepo.findOne({ where: { id: checkId } });
    if (!check) throw new NotFoundException(`QA check ${checkId} not found`);

    const wasNotPassed = check.status !== 'passed';

    if (dto.testTitle !== undefined) check.testTitle = dto.testTitle;
    if (dto.expectedResult !== undefined) check.expectedResult = dto.expectedResult;
    if (dto.actualResult !== undefined) check.actualResult = dto.actualResult ?? null;
    if (dto.status !== undefined) check.status = dto.status as QaCheckStatus;
    if (dto.tester !== undefined) check.tester = dto.tester ?? null;
    if (dto.notes !== undefined) check.notes = dto.notes ?? null;

    const saved = await this.qaCheckRepo.save(check) as QaCheck;

    // Award once when a check transitions to passed for the first time
    if (wasNotPassed && dto.status === 'passed') {
      await this.scoreService.awardOnce(user.id, 'qa_check_passed', checkId, 1);
    }

    return saved;
  }

  async removeQaCheck(checkId: string): Promise<void> {
    const check = await this.qaCheckRepo.findOne({ where: { id: checkId } });
    if (!check) throw new NotFoundException(`QA check ${checkId} not found`);
    await this.qaCheckRepo.remove(check);
  }

  // --- Private helpers ---

  private assertAllowedTransition(from: WorkItemStatus, to: WorkItemStatus): void {
    const allowed = ALLOWED_TRANSITIONS[from];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Cannot move work item from '${from}' to '${to}'. ` +
          `Allowed next states: [${allowed.join(', ') || 'none'}].`,
      );
    }
  }

  private async assertQaReady(workItemId: string): Promise<void> {
    const checks = await this.qaCheckRepo.find({ where: { workItemId } });

    if (checks.length === 0) {
      throw new BadRequestException(
        'Work item cannot be marked ready for release: no QA checks exist. ' +
          'Add at least one QA check and mark it passed.',
      );
    }

    const notPassed = checks.filter((c) => c.status !== 'passed');
    if (notPassed.length > 0) {
      throw new BadRequestException(
        `Work item cannot be marked ready for release: ` +
          `${notPassed.length} QA check(s) are not passed (${notPassed.map((c) => `"${c.testTitle}": ${c.status}`).join(', ')}).`,
      );
    }
  }
}
