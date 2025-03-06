// pdf/pdf.controller.ts
import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  PdfService,
  ParseImageResponse,
  BatchJobResponse,
  JobResultsResponse,
  ActiveJobsResponse,
} from './pdf.service';

@Controller('pdf')
export class PdfController {
  constructor(private readonly pdfService: PdfService) {}

  // Метод для обработки одной страницы (без изменений)
  @Post('parse-image')
  @UseInterceptors(
    FileInterceptor('image', {
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          return callback(
            new BadRequestException('Только изображения допустимы'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async parseImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('structured') structured: boolean = false,
  ): Promise<ParseImageResponse> {
    console.log(
      `Получено изображение: ${file.originalname}, структурированный формат: ${structured}`,
    );
    try {
      const result = await this.pdfService.parseImage(file.buffer, structured);
      return {
        status: { success: true },
        data: {
          fileName: file.originalname,
          result: result,
        },
      };
    } catch (error) {
      console.error('Ошибка при обработке изображения:', error);
      return {
        status: {
          success: false,
          message:
            'Ошибка при обработке изображения: ' +
            (error.message || 'Неизвестная ошибка'),
        },
        data: null,
      };
    }
  }

  // НОВЫЙ МЕТОД: Создание задачи пакетной обработки
  @Post('create-batch-job')
  @UseInterceptors(
    FilesInterceptor('images', 300, {
      // Увеличил максимальное количество файлов до 300
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          return callback(
            new BadRequestException('Только изображения допустимы'),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // Ограничиваем размер файла 10MB
      },
    }),
  )
  async createBatchJob(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('structured') structured: boolean = false,
  ): Promise<BatchJobResponse> {
    console.log(
      `Получено ${files.length} файлов для создания задачи, структурированный формат: ${structured}`,
    );

    try {
      if (!files || files.length === 0) {
        throw new BadRequestException('Не загружено ни одного файла');
      }

      // Сортируем файлы по имени для правильного порядка страниц
      const sortedFiles = [...files].sort((a, b) =>
        a.originalname.localeCompare(b.originalname),
      );

      // Получаем имена файлов
      const fileNames = sortedFiles.map((file) => file.originalname);

      // Создаем задачу
      const job = await this.pdfService.createBatchJob(fileNames, structured);

      // Создаем карту буферов
      const bufferMap: { [fileName: string]: Buffer } = {};
      sortedFiles.forEach((file) => {
        bufferMap[file.originalname] = file.buffer;
      });

      // Запускаем обработку в фоновом режиме
      this.pdfService
        .processBatchWithRecovery(job.id, bufferMap)
        .catch((error) =>
          console.error(`Ошибка в фоновой обработке задачи ${job.id}:`, error),
        );

      return {
        status: {
          success: true,
          message: 'Задача создана и запущена',
        },
        data: {
          jobId: job.id,
          totalFiles: job.totalFiles,
          structured: job.structured,
          status: job.status,
        },
      };
    } catch (error) {
      console.error('Ошибка при создании задачи:', error);
      return {
        status: {
          success: false,
          message: `Ошибка при создании задачи: ${error.message || 'Неизвестная ошибка'}`,
        },
        data: null,
      };
    }
  }

  // НОВЫЙ МЕТОД: Загрузка дополнительных файлов к существующей задаче
  @Post('append-files/:jobId')
  @UseInterceptors(
    FilesInterceptor('images', 100, {
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          return callback(
            new BadRequestException('Только изображения допустимы'),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async appendFilesToJob(
    @Param('jobId') jobId: number,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<BatchJobResponse> {
    console.log(`Загрузка дополнительных файлов для задачи ${jobId}`);

    try {
      if (!files || files.length === 0) {
        throw new BadRequestException('Не загружено ни одного файла');
      }

      // Получаем информацию о задаче
      const job = await this.pdfService.getJobInfo(jobId);

      // Проверяем, что задача существует и не завершена
      if (job.status === 'completed' || job.status === 'failed') {
        throw new BadRequestException(
          `Задача ${jobId} уже ${job.status === 'completed' ? 'завершена' : 'завершилась с ошибкой'}`,
        );
      }

      // Создаем карту буферов
      const bufferMap: { [fileName: string]: Buffer } = {};
      files.forEach((file) => {
        bufferMap[file.originalname] = file.buffer;
      });

      // Если задача приостановлена, возобновляем её
      if (job.status === 'paused') {
        // Запускаем обработку в фоновом режиме
        this.pdfService
          .resumeJob(jobId, bufferMap)
          .catch((error) =>
            console.error(`Ошибка при возобновлении задачи ${jobId}:`, error),
          );

        return {
          status: {
            success: true,
            message: 'Задача возобновлена',
          },
          data: {
            jobId: job.id,
            totalFiles: job.totalFiles,
            processedFiles: job.processedFiles,
            status: 'processing',
          },
        };
      } else {
        return {
          status: {
            success: true,
            message: 'Файлы получены, но задача уже запущена',
          },
          data: {
            jobId: job.id,
            totalFiles: job.totalFiles,
            processedFiles: job.processedFiles,
            status: job.status,
          },
        };
      }
    } catch (error) {
      console.error(`Ошибка при добавлении файлов к задаче ${jobId}:`, error);
      return {
        status: {
          success: false,
          message: `Ошибка при добавлении файлов: ${error.message || 'Неизвестная ошибка'}`,
        },
        data: null,
      };
    }
  }

  // НОВЫЙ МЕТОД: Получение информации о задаче
  @Get('job/:jobId')
  async getJobInfo(@Param('jobId') jobId: number): Promise<BatchJobResponse> {
    try {
      const job = await this.pdfService.getJobInfo(jobId);

      return {
        status: {
          success: true,
        },
        data: {
          jobId: job.id,
          totalFiles: job.totalFiles,
          processedFiles: job.processedFiles,
          status: job.status,
          progress: `${job.processedFiles}/${job.totalFiles}`,
          percentComplete: Math.round(
            (job.processedFiles / job.totalFiles) * 100,
          ),
          createdAt: job.createdAt,
          updatedAt: job.updatedAt,
        },
      };
    } catch (error) {
      console.error(
        `Ошибка при получении информации о задаче ${jobId}:`,
        error,
      );
      return {
        status: {
          success: false,
          message: `Ошибка при получении информации о задаче: ${error.message || 'Неизвестная ошибка'}`,
        },
        data: null,
      };
    }
  }

  // НОВЫЙ МЕТОД: Получение результатов задачи
  @Get('job/:jobId/results')
  async getJobResults(
    @Param('jobId') jobId: number,
    @Query('from') from: number = 0,
    @Query('to') to: number = -1,
  ): Promise<JobResultsResponse> {
    try {
      const job = await this.pdfService.getJobInfo(jobId);
      const results = await this.pdfService.getJobResults(jobId);

      // Если указан диапазон, возвращаем только часть результатов
      let filteredResults = results;
      if (to >= 0) {
        filteredResults = results.filter(
          (r) => r.fileIndex >= from && r.fileIndex <= to,
        );
      } else if (from > 0) {
        filteredResults = results.filter((r) => r.fileIndex >= from);
      }

      return {
        status: {
          success: true,
        },
        data: {
          jobId: job.id,
          totalFiles: job.totalFiles,
          processedFiles: job.processedFiles,
          status: job.status,
          resultsCount: filteredResults.length,
          results: filteredResults.map((r) => ({
            fileName: r.fileName,
            fileIndex: r.fileIndex,
            result: r.result,
          })),
        },
      };
    } catch (error) {
      console.error(`Ошибка при получении результатов задачи ${jobId}:`, error);
      return {
        status: {
          success: false,
          message: `Ошибка при получении результатов: ${error.message || 'Неизвестная ошибка'}`,
        },
        data: null,
      };
    }
  }

  // НОВЫЙ МЕТОД: Получение списка активных задач
  @Get('active-jobs')
  async getActiveJobs(): Promise<ActiveJobsResponse> {
    try {
      const jobs = await this.pdfService.getUnfinishedJobs();

      return {
        status: {
          success: true,
        },
        data: {
          count: jobs.length,
          jobs: jobs.map((job) => ({
            jobId: job.id,
            totalFiles: job.totalFiles,
            processedFiles: job.processedFiles,
            status: job.status,
            progress: `${job.processedFiles}/${job.totalFiles}`,
            percentComplete: Math.round(
              (job.processedFiles / job.totalFiles) * 100,
            ),
            createdAt: job.createdAt,
            updatedAt: job.updatedAt,
          })),
        },
      };
    } catch (error) {
      console.error('Ошибка при получении списка активных задач:', error);
      return {
        status: {
          success: false,
          message: `Ошибка при получении списка задач: ${error.message || 'Неизвестная ошибка'}`,
        },
        data: null,
      };
    }
  }

  // НОВЫЙ МЕТОД: Приостановка задачи
  @Post('job/:jobId/pause')
  async pauseJob(@Param('jobId') jobId: number): Promise<BatchJobResponse> {
    try {
      const job = await this.pdfService.updateJobStatus(jobId, 'paused');

      return {
        status: {
          success: true,
          message: 'Задача приостановлена',
        },
        data: {
          jobId: job.id,
          totalFiles: job.totalFiles,
          processedFiles: job.processedFiles,
          status: job.status,
        },
      };
    } catch (error) {
      console.error(`Ошибка при приостановке задачи ${jobId}:`, error);
      return {
        status: {
          success: false,
          message: `Ошибка при приостановке задачи: ${error.message || 'Неизвестная ошибка'}`,
        },
        data: null,
      };
    }
  }

  // Для обратной совместимости сохраняем старый метод parse-batch,
  // но внутри используем новую систему
  @Post('parse-batch')
  @UseInterceptors(
    FilesInterceptor('images', 20, {
      fileFilter: (_req, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          return callback(
            new BadRequestException('Только изображения допустимы'),
            false,
          );
        }
        callback(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async parseBatch(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('structured') structured: boolean = false,
  ) {
    console.log(
      `Получено ${files.length} файлов для пакетной обработки, структурированный формат: ${structured}`,
    );

    try {
      if (!files || files.length === 0) {
        throw new BadRequestException('Не загружено ни одного файла');
      }

      // Сортируем файлы по имени для правильного порядка страниц
      const sortedFiles = [...files].sort((a, b) =>
        a.originalname.localeCompare(b.originalname),
      );

      // Получаем имена файлов и буферы
      const fileNames = sortedFiles.map((file) => file.originalname);
      const buffers = sortedFiles.map((file) => file.buffer);

      // Используем новый метод для пакетной обработки
      const results = await this.pdfService.parseBatch(
        buffers,
        fileNames,
        structured,
      );

      return {
        status: {
          success: true,
          message: 'Страницы успешно обработаны',
        },
        data: {
          totalPages: results.length,
          fileNames: fileNames,
          pages: results,
        },
      };
    } catch (error) {
      console.error('Ошибка при пакетной обработке:', error.message || error);
      return {
        status: {
          success: false,
          message: `Ошибка при пакетной обработке: ${error.message || 'Неизвестная ошибка'}`,
        },
        data: null,
      };
    }
  }
}
