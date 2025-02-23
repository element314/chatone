import { Context } from 'grammy';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pipeline } from 'stream/promises';
import OpenAI from 'openai';

interface FileResult {
  file_id: string;
  file_unique_id: string;
  file_path?: string;
  file_size?: number;
}

type FileContext = Context & {
  getFile: () => Promise<FileResult>;
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000, // увеличиваем таймаут до 60 секунд
});

// Устанавливаем лимит в 20 MB (Telegram Bot API не позволяет скачивать файлы больше 20 MB)
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 20 MB в байтах
const TMP_DIR = '/tmp/voice-messages';

export async function transcribeVoiceMessage(
  ctx: FileContext,
): Promise<string> {
  try {
    // Если голосового сообщения нет, выбрасываем ошибку
    if (!ctx.message.voice) {
      throw new Error('Нет голосового сообщения для транскрипции');
    }

    // Создаем временную директорию, если ее еще нет
    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true });
    }

    // Получаем информацию о файле
    const file = await ctx.getFile();
    console.log('File information:', {
      fileId: file.file_id,
      fileUniqueId: file.file_unique_id,
      filePath: file.file_path,
      fileSize: file.file_size,
      duration: ctx.message.voice.duration,
    });

    // Если размер файла превышает лимит (дополнительная проверка)
    if (file.file_size && file.file_size > MAX_FILE_SIZE) {
      throw new Error(
        `File size (${(file.file_size / 1024 / 1024).toFixed(2)} MB) exceeds maximum allowed size (20 MB)`,
      );
    }

    if (!file.file_path) {
      throw new Error('Путь к файлу не найден в объекте Telegram');
    }

    if (!process.env.TELEGRAM_BOT_TOKEN) {
      throw new Error('TELEGRAM_BOT_TOKEN не определён');
    }

    // Формируем URL для скачивания файла
    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    const localFilePath = path.join(TMP_DIR, `${file.file_unique_id}.ogg`);

    console.log('Downloading voice message...');
    const response = await fetch(fileUrl);
    if (!response.ok || !response.body) {
      throw new Error(`Не удалось скачать файл: ${response.statusText}`);
    }

    await pipeline(response.body, fs.createWriteStream(localFilePath));

    const stats = fs.statSync(localFilePath);
    console.log('File stats:', {
      size: `${(stats.size / 1024 / 1024).toFixed(2)} MB`,
      created: stats.birthtime,
    });

    console.log('Starting transcription with OpenAI Whisper');

    // Добавляем повторные попытки при ошибке соединения
    let attempts = 3;
    let transcription;

    while (attempts > 0) {
      try {
        transcription = await openai.audio.transcriptions.create({
          file: fs.createReadStream(localFilePath),
          model: 'whisper-1',
          response_format: 'text',
        });
        console.log('Transcription result:', {
          text: transcription as string,
        });
        break;
      } catch (error) {
        attempts--;
        if (attempts === 0) throw error;
        console.log(
          `Transcription attempt failed, retrying... (${attempts} attempts left)`,
        );
        await new Promise((resolve) => setTimeout(resolve, 2000)); // ждем 2 секунды перед повторной попыткой
      }
    }

    try {
      fs.unlinkSync(localFilePath);
      console.log('Temporary file deleted successfully');
    } catch (error) {
      console.warn('Не удалось удалить временный файл:', error);
    }

    return transcription as string;
  } catch (error) {
    console.error('Error in transcribeVoiceMessage:', error);
    // Если ошибка связана с размером файла – возвращаем понятное сообщение
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-unsafe-call
    if (error.message.includes('exceeds maximum allowed size')) {
      return `⚠️ Извините, голосовое сообщение слишком большое для обработки (максимум 20 MB).`;
    }
    throw error;
  }
}
