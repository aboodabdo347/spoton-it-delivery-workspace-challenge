import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Entity('score_events')
@Unique(['userId', 'action', 'entityId'])
export class ScoreEvent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  userId!: string;

  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Column({ type: 'varchar', length: 200 })
  entityId!: string;

  @Column({ type: 'integer' })
  points!: number;

  @CreateDateColumn()
  createdAt!: Date;
}
