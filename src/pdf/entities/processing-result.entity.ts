// pdf/entities/processing-result.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProcessingJob } from './processing-job.entity';

@Entity()
export class ProcessingResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  jobId: number;

  @ManyToOne(() => ProcessingJob, (job) => job.results)
  @JoinColumn({ name: 'jobId' })
  job: ProcessingJob;

  @Column()
  fileName: string;

  @Column({ type: 'int' })
  fileIndex: number;

  @Column({ type: 'json' })
  result: any;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;
}
