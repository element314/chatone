// pdf/pdf.service.ts
import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessingJob } from './entities/processing-job.entity';
import { ProcessingResult } from './entities/processing-result.entity';

// Типы ответов и данных, выделенные отдельно
export interface ParseImageResponse {
  status: {
    success: boolean;
    message?: string;
  };
  data: {
    fileName: string;
    result: any;
  } | null;
}

export interface BatchJobResponse {
  status: {
    success: boolean;
    message?: string;
  };
  data: {
    jobId: number;
    totalFiles: number;
    processedFiles?: number;
    structured?: boolean;
    status: string;
    progress?: string;
    percentComplete?: number;
    createdAt?: Date;
    updatedAt?: Date;
  } | null;
}

export interface JobResultsResponse {
  status: {
    success: boolean;
    message?: string;
  };
  data: {
    jobId: number;
    totalFiles: number;
    processedFiles: number;
    status: string;
    resultsCount: number;
    results: {
      fileName: string;
      fileIndex: number;
      result: any;
    }[];
  } | null;
}

export interface ActiveJobsResponse {
  status: {
    success: boolean;
    message?: string;
  };
  data: {
    count: number;
    jobs: {
      jobId: number;
      totalFiles: number;
      processedFiles: number;
      status: string;
      progress: string;
      percentComplete: number;
      createdAt: Date;
      updatedAt: Date;
    }[];
  } | null;
}

// Тип данных для структурированной страницы учебника
export interface TextbookPageData {
  metadata: {
    pageNumber: number;
    unitNumber: string;
    lessonID: string;
    lessonTitle: string;
  };
  sections: {
    title: string;
    exercises: {
      id: string;
      type: string;
      instructions: string;
      content: {
        dialogues?: {
          number: number;
          context?: string;
          exchanges: {
            speaker: string;
            text: string;
          }[];
        }[];
        items?: string[];
        gapFill?: string[];
        images?: string[];
      };
    }[];
  }[];
  grammarPoints: {
    title: string;
    rules: string[];
    examples: string[];
  }[];
  vocabularyItems: {
    word: string;
    translation?: string;
    phonetic?: string;
    category?: string;
  }[];
  pronunciationFocus: {
    sounds: string[];
    examples: string[];
  };
  mediaReferences: {
    audio: string[];
    video: string[];
    externalPages: string[];
  };
  visualElements: {
    type: string;
    id: number;
    description: string;
  }[];
}

@Injectable()
export class PdfService {
  private openai: OpenAI;

  constructor(
    @InjectRepository(ProcessingJob)
    private jobRepository: Repository<ProcessingJob>,
    @InjectRepository(ProcessingResult)
    private resultRepository: Repository<ProcessingResult>,
  ) {
    // Инициализируем OpenAI с API ключом и увеличенными таймаутами
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 180000, // 3 минуты на запрос
      maxRetries: 3, // Попытки при ошибках
    });
  }

  // Метод для обработки одного изображения
  async parseImage(
    imageBuffer: Buffer,
    structured: boolean = false,
  ): Promise<any> {
    // Добавляем обработку ошибок на все методы
    try {
      // Если запрошен структурированный формат
      if (structured) {
        return await this.parseTextbookPage(imageBuffer);
      } else {
        // Используем обычный текстовый анализ
        return await this.parseImageToText(imageBuffer);
      }
    } catch (error) {
      console.error('Ошибка в методе parseImage:', error);
      throw new Error(
        `Ошибка при обработке изображения: ${error.message || 'Неизвестная ошибка'}`,
      );
    }
  }

  // Метод для извлечения текста из изображения
  private async parseImageToText(imageBuffer: Buffer): Promise<string> {
    try {
      // Конвертируем изображение в base64
      const base64Image = imageBuffer.toString('base64');

      // Отправляем запрос к OpenAI Vision API
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Извлеки весь текст с этой страницы учебника английского языка. Сохрани простое форматирование (абзацы, номера упражнений). Если видишь упражнения с пропусками, отметь их как [пропуск]. Если есть диалоги, сохрани структуру диалога. Используй минимальное форматирование, только для сохранения читаемости текста.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 4096,
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('Ошибка при преобразовании изображения в текст:', error);
      throw error; // Пробрасываем ошибку для обработки на уровне выше
    }
  }

  // Метод для структурированной обработки страницы учебника
  private async parseTextbookPage(imageBuffer: Buffer): Promise<any> {
    try {
      // Конвертируем изображение в base64
      const base64Image = imageBuffer.toString('base64');

      // Отправляем запрос к OpenAI Vision API с промптом для структурированного ответа
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Проанализируй эту страницу учебника английского языка English File и создай структурированный JSON-объект со следующей структурой:

{
  "metadata": {
    "pageNumber": число,
    "unitNumber": "строка",
    "lessonID": "строка (например 1A, 2B)",
    "lessonTitle": "строка"
  },
  "sections": [
    {
      "title": "строка (например LISTENING & SPEAKING, GRAMMAR, VOCABULARY, PRONUNCIATION)",
      "exercises": [
        {
          "id": "строка (номер упражнения)",
          "type": "строка (listening, speaking, reading, writing, grammar, vocabulary, pronunciation)",
          "instructions": "строка с инструкциями",
          "content": {
            "dialogues": [
              {
                "number": число,
                "context": "описание ситуации",
                "exchanges": [
                  {"speaker": "имя говорящего", "text": "реплика"}
                ]
              }
            ],
            "items": ["элементы упражнения"],
            "gapFill": ["элементы с пропусками"],
            "images": ["описания изображений"]
          }
        }
      ]
    }
  ],
  "grammarPoints": [
    {
      "title": "название грамматической темы",
      "rules": ["грамматические правила"],
      "examples": ["примеры использования"]
    }
  ],
  "vocabularyItems": [
    {
      "word": "слово",
      "translation": "перевод",
      "phonetic": "фонетическая транскрипция",
      "category": "категория словаря"
    }
  ],
  "pronunciationFocus": {
    "sounds": ["фокусные звуки"],
    "examples": ["примеры слов"]
  },
  "mediaReferences": {
    "audio": ["идентификаторы аудио, например 1.2, 1.3"],
    "video": ["идентификаторы видео"],
    "externalPages": ["ссылки на другие страницы, например p.92"]
  },
  "visualElements": [
    {
      "type": "тип элемента (photo, chart, table)",
      "id": число,
      "description": "описание визуального элемента"
    }
  ]
}

ВАЖНО: 
1. Верни ТОЛЬКО JSON, без пояснений или markdown-разметки
2. Если какого-то раздела нет на странице, включи пустой массив []
3. В dialogues.context кратко опиши ситуацию диалога
4. Включи все аудио/видео ссылки в mediaReferences
5. Извлеки информацию максимально полно, но структурированно
6. Описывай содержимое страницы, но не копируй длинные тексты дословно
7. Для каждого упражнения указывай его тип и цель
8. Логически организуй материал даже если на странице представлен в другом порядке`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/png;base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 4096,
      });

      // Парсим JSON из ответа
      try {
        return JSON.parse(response.choices[0].message.content);
      } catch (error) {
        console.error('Ошибка при разборе JSON:', error);
        throw new Error('Не удалось получить корректные данные из API');
      }
    } catch (error) {
      console.error(
        'Ошибка при структурированной обработке изображения:',
        error,
      );
      throw error;
    }
  }

  // НОВЫЙ МЕТОД: Создание задачи пакетной обработки
  async createBatchJob(
    fileNames: string[],
    structured: boolean = false,
  ): Promise<ProcessingJob> {
    const job = this.jobRepository.create({
      totalFiles: fileNames.length,
      processedFiles: 0,
      fileNames: fileNames,
      structured: structured,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return this.jobRepository.save(job);
  }

  // НОВЫЙ МЕТОД: Получение информации о задаче
  async getJobInfo(jobId: number): Promise<ProcessingJob> {
    const job = await this.jobRepository.findOne({
      where: { id: jobId },
      relations: ['results'],
    });

    if (!job) {
      throw new Error(`Задача с ID ${jobId} не найдена`);
    }

    return job;
  }

  // НОВЫЙ МЕТОД: Получение списка незавершенных задач
  async getUnfinishedJobs(): Promise<ProcessingJob[]> {
    return this.jobRepository.find({
      where: [
        { status: 'pending' },
        { status: 'processing' },
        { status: 'paused' },
      ],
    });
  }

  // НОВЫЙ МЕТОД: Обновление статуса задачи
  async updateJobStatus(
    jobId: number,
    status: 'pending' | 'processing' | 'paused' | 'completed' | 'failed',
    processedFiles?: number,
  ): Promise<ProcessingJob> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });

    if (!job) {
      throw new Error(`Задача с ID ${jobId} не найдена`);
    }

    job.status = status;
    if (processedFiles !== undefined) {
      job.processedFiles = processedFiles;
    }
    job.updatedAt = new Date();

    return this.jobRepository.save(job);
  }

  // НОВЫЙ МЕТОД: Сохранение результата обработки страницы
  async saveProcessingResult(
    jobId: number,
    fileName: string,
    fileIndex: number,
    result: any,
  ): Promise<ProcessingResult> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });

    if (!job) {
      throw new Error(`Задача с ID ${jobId} не найдена`);
    }

    // Проверяем, существует ли уже результат с таким индексом
    const existingResult = await this.resultRepository.findOne({
      where: { jobId, fileIndex },
    });

    if (existingResult) {
      // Обновляем существующий результат
      existingResult.result = result;
      existingResult.updatedAt = new Date();
      return this.resultRepository.save(existingResult);
    } else {
      // Создаем новый результат
      const processingResult = this.resultRepository.create({
        jobId,
        fileName,
        fileIndex,
        result,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return this.resultRepository.save(processingResult);
    }
  }

  // НОВЫЙ МЕТОД: Обработка пакета с возможностью восстановления
  async processBatchWithRecovery(
    jobId: number,
    imageBuffers: { [fileName: string]: Buffer },
    startIndex: number = 0,
  ): Promise<void> {
    const job = await this.getJobInfo(jobId);

    if (!job) {
      throw new Error(`Задача с ID ${jobId} не найдена`);
    }

    // Если задача уже завершена, выходим
    if (job.status === 'completed' || job.status === 'failed') {
      console.log(`Задача ${jobId} уже ${job.status}, обработка не требуется`);
      return;
    }

    // Обновляем статус задачи
    await this.updateJobStatus(jobId, 'processing');

    try {
      // Обработка файлов, начиная с указанного индекса
      for (let i = startIndex; i < job.fileNames.length; i++) {
        const fileName = job.fileNames[i];
        const buffer = imageBuffers[fileName];

        if (!buffer) {
          console.error(`Буфер не найден для файла ${fileName}`);
          continue;
        }

        console.log(
          `Обработка файла ${i + 1}/${job.fileNames.length}: ${fileName}`,
        );

        try {
          // Обрабатываем изображение
          const result = await this.parseImage(buffer, job.structured);

          // Сохраняем результат
          await this.saveProcessingResult(jobId, fileName, i, result);

          // Обновляем прогресс
          await this.updateJobStatus(jobId, 'processing', i + 1);

          console.log(
            `Успешно обработан файл ${i + 1}/${job.fileNames.length}`,
          );
        } catch (error) {
          console.error(`Ошибка обработки файла ${fileName}:`, error);

          // Сохраняем ошибку как результат
          await this.saveProcessingResult(jobId, fileName, i, {
            error: error.message || 'Неизвестная ошибка',
          });
        }

        // Добавляем паузу между обработкой файлов
        if (i < job.fileNames.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }

      // Обновляем статус задачи на "завершено"
      await this.updateJobStatus(jobId, 'completed', job.fileNames.length);
      console.log(`Задача ${jobId} успешно завершена`);
    } catch (error) {
      console.error(`Ошибка в пакетной обработке для задачи ${jobId}:`, error);

      // Обновляем статус задачи на "ошибка"
      await this.updateJobStatus(jobId, 'failed');

      throw error;
    }
  }

  // НОВЫЙ МЕТОД: Получение результатов задачи
  async getJobResults(jobId: number): Promise<ProcessingResult[]> {
    return this.resultRepository.find({
      where: { jobId },
      order: { fileIndex: 'ASC' },
    });
  }

  // НОВЫЙ МЕТОД: Возобновление обработки задачи
  async resumeJob(
    jobId: number,
    imageBuffers: { [fileName: string]: Buffer },
  ): Promise<void> {
    const job = await this.getJobInfo(jobId);

    if (!job) {
      throw new Error(`Задача с ID ${jobId} не найдена`);
    }

    // Получаем последний обработанный индекс
    const startIndex = job.processedFiles;

    // Возобновляем обработку
    return this.processBatchWithRecovery(jobId, imageBuffers, startIndex);
  }

  // Для обратной совместимости сохраняем старый метод parseBatch,
  // но переделываем его для использования новой системы
  async parseBatch(
    imageBuffers: Buffer[],
    fileNames: string[],
    structured: boolean = false,
  ): Promise<any[]> {
    try {
      // Создаем новую задачу
      const job = await this.createBatchJob(fileNames, structured);

      // Создаем карту буферов
      const bufferMap: { [fileName: string]: Buffer } = {};
      fileNames.forEach((name, index) => {
        bufferMap[name] = imageBuffers[index];
      });

      // Запускаем обработку
      await this.processBatchWithRecovery(job.id, bufferMap);

      // Получаем результаты
      const results = await this.getJobResults(job.id);

      // Преобразуем в формат, который ожидает старый API
      return results.map((r) => r.result);
    } catch (error) {
      console.error('Ошибка при пакетной обработке:', error);
      throw error;
    }
  }
}
