import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { WorkItem, WorkItemStatus, WorkItemType, WorkItemPriority } from './work-item.entity';
import { CreateWorkItemDto } from './dto/create-work-item.dto';
import { UpdateWorkItemDto } from './dto/update-work-item.dto';
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
  ) {}

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
    return this.workItemRepo.save(item) as Promise<WorkItem>;
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

  async update(id: string, dto: UpdateWorkItemDto): Promise<WorkItem> {
    const item = await this.findOne(id);

    const newStatus = dto.status as WorkItemStatus | undefined;
    if (newStatus && newStatus !== item.status) {
      this.validateTransition(item.status, newStatus);
    }

    if (dto.title !== undefined) item.title = dto.title;
    if (dto.description !== undefined) item.description = dto.description ?? null;
    if (dto.type !== undefined) item.type = dto.type as WorkItemType;
    if (dto.priority !== undefined) item.priority = dto.priority as WorkItemPriority;
    if (dto.assignee !== undefined) item.assignee = dto.assignee ?? null;
    if (dto.dueDate !== undefined) item.dueDate = dto.dueDate ?? null;
    if (newStatus !== undefined) item.status = newStatus;

    return this.workItemRepo.save(item) as Promise<WorkItem>;
  }

  async remove(id: string): Promise<void> {
    const item = await this.findOne(id);
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

  private validateTransition(from: WorkItemStatus, to: WorkItemStatus): void {
    const allowed = ALLOWED_TRANSITIONS[from];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `Cannot move work item from '${from}' to '${to}'. ` +
          `Allowed next states: [${allowed.join(', ') || 'none'}].`,
      );
    }
  }
}
