// pdf/entities/processing-job.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { ProcessingResult } from './processing-result.entity';

@Entity()
export class ProcessingJob {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  totalFiles: number;

  @Column({ type: 'int', default: 0 })
  processedFiles: number;

  @Column({ type: 'simple-array' })
  fileNames: string[];

  @Column({ type: 'boolean', default: false })
  structured: boolean;

  @Column({
    type: 'enum',
    enum: ['pending', 'processing', 'paused', 'completed', 'failed'],
    default: 'pending',
  })
  status: 'pending' | 'processing' | 'paused' | 'completed' | 'failed';

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @OneToMany(() => ProcessingResult, (result) => result.job)
  results: ProcessingResult[];
}
