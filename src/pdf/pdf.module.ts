import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';
import { ProcessingJob } from './entities/processing-job.entity';
import { ProcessingResult } from './entities/processing-result.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProcessingJob, ProcessingResult]), // Явно импортируем сущности для создания репозиториев
  ],
  controllers: [PdfController],
  providers: [PdfService],
})
export class PdfModule {}
