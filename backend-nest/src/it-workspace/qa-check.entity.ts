import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type QaCheckStatus = 'pending' | 'passed' | 'failed';

@Entity('qa_checks')
export class QaCheck {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  workItemId: string;

  @Column({ type: 'varchar', length: 300 })
  testTitle: string;

  @Column({ type: 'text' })
  expectedResult: string;

  @Column({ type: 'text', nullable: true })
  actualResult: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: QaCheckStatus;

  @Column({ type: 'varchar', length: 200, nullable: true })
  tester: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
