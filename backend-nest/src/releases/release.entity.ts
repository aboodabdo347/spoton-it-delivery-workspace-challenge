import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type DeploymentStatus = 'draft' | 'scheduled' | 'deployed' | 'rolled_back';

const jsonArrayTransformer = {
  to: (v: string[]): string => JSON.stringify(v ?? []),
  from: (v: string | null): string[] => {
    try { return JSON.parse(v ?? '[]'); } catch { return []; }
  },
};

@Entity('releases')
export class Release {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  version: string;

  @Column({ type: 'date', nullable: true })
  releaseDate: string | null;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'varchar', length: 20, default: 'draft' })
  deploymentStatus: DeploymentStatus;

  @Column({ type: 'text', default: '[]', transformer: jsonArrayTransformer })
  linkedWorkItemIds: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
