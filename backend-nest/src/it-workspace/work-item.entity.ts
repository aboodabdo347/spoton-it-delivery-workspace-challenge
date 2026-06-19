import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type WorkItemType = 'feature' | 'bug' | 'improvement' | 'maintenance';
export type WorkItemStatus =
  | 'backlog'
  | 'planned'
  | 'in_progress'
  | 'qa'
  | 'ready_for_release'
  | 'released';
export type WorkItemPriority = 'low' | 'medium' | 'high' | 'urgent';

@Entity('work_items')
export class WorkItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 50 })
  type: WorkItemType;

  @Column({ type: 'varchar', length: 50, default: 'backlog' })
  status: WorkItemStatus;

  @Column({ type: 'varchar', length: 20, default: 'medium' })
  priority: WorkItemPriority;

  @Column({ type: 'varchar', length: 200, nullable: true })
  assignee: string | null;

  @Column({ type: 'date', nullable: true })
  dueDate: string | null;

  @Column({ type: 'varchar', length: 200 })
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
