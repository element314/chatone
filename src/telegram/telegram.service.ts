import { Injectable, OnModuleInit } from '@nestjs/common';
import { Bot, Context, InputFile } from 'grammy';
import { ChatService } from '../chat/chat.service';
import {
  sanitizeHtmlForTelegram,
  splitHtmlMessage,
} from './helpers/convertToTelegramFormat';
import { transcribeVoiceMessage } from './helpers/transcribeVoice';
import * as fs from 'node:fs';
import * as path from 'node:path';
import OpenAI from 'openai';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is not defined');
}

// Экземпляр OpenAI для TTS (Text-to-Speech)
const ttsOpenai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000,
});

// Функция для отправки текстового сообщения (если ответ нужен текстом)
async function sendMessage(bot: Bot<Context>, chatId: string, text: string) {
  const MAX_LENGTH = 4000;
  const sanitized = sanitizeHtmlForTelegram(text);
  console.log('[sendMessage] Sanitized text:', sanitized);
  const parts =
    sanitized.length > MAX_LENGTH
      ? splitHtmlMessage(sanitized, MAX_LENGTH)
      : [sanitized];
  console.log('[sendMessage] Message parts:', parts);
  for (const part of parts) {
    if (part.trim() !== '') {
      console.log(`[sendMessage] Sending part: ${part.slice(0, 50)}...`);
      await bot.api.sendMessage(chatId, part, { parse_mode: 'HTML' });
    } else {
      console.log('[sendMessage] Skipping empty message part');
    }
  }
}

// Функция для генерации голосового ответа через OpenAI TTS API и отправки его в Telegram
async function sendVoiceResponse(
  bot: Bot<Context>,
  chatId: string,
  text: string,
) {
  try {
    const ttsResponse = await ttsOpenai.audio.speech.create({
      model: 'tts-1',
      voice: 'alloy',
      input: text,
      response_format: 'opus',
    });
    const buffer = Buffer.from(await ttsResponse.arrayBuffer());
    const TMP_VOICE_DIR = '/tmp/voice-responses';
    if (!fs.existsSync(TMP_VOICE_DIR)) {
      fs.mkdirSync(TMP_VOICE_DIR, { recursive: true });
      console.log('[sendVoiceResponse] Created TMP_VOICE_DIR:', TMP_VOICE_DIR);
    }
    const filePath = path.join(TMP_VOICE_DIR, `response_${Date.now()}.ogg`);
    await fs.promises.writeFile(filePath, buffer);
    console.log('[sendVoiceResponse] Saved TTS audio to file:', filePath);

    // Логируем статистику файла
    const stats = fs.statSync(filePath);
    console.log('[sendVoiceResponse] File stats:', {
      size: `${(stats.size / 1024).toFixed(2)} KB`,
      created: stats.birthtime,
    });

    // Создаем InputFile через конструктор
    const voiceInput = new InputFile(fs.createReadStream(filePath));
    await bot.api.sendVoice(chatId, voiceInput);
    console.log('[sendVoiceResponse] Voice message sent successfully.');

    // Удаляем временный файл (асинхронно)
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error(
          '[sendVoiceResponse] Error deleting temporary file:',
          err,
        );
      } else {
        console.log('[sendVoiceResponse] Temporary file deleted successfully.');
      }
    });
  } catch (error) {
    console.error(
      '[sendVoiceResponse] Error generating voice response:',
      error,
    );
    await bot.api.sendMessage(
      chatId,
      'Ошибка при генерации голосового ответа.',
    );
  }
}

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: Bot<Context>;

  constructor(private readonly chatService: ChatService) {
    this.bot = new Bot<Context>(TELEGRAM_BOT_TOKEN);

    this.bot.command('start', async (ctx) => {
      await ctx.reply('Привет! Я бот на NestJS!');
    });

    this.bot.on('message', async (ctx) => {
      try {
        const chatId = String(ctx.chat.id);
        let userMessageText: string;

        if (ctx.message.voice) {
          console.log('[onMessage] Received voice message');
          userMessageText = await transcribeVoiceMessage(ctx);
          sendMessage(this.bot, chatId, `Транскрибация: ${userMessageText}`);
        } else if (ctx.message.text) {
          console.log('[onMessage] Received text message:', ctx.message.text);
          userMessageText = ctx.message.text;
        } else {
          console.log('[onMessage] Unsupported message type');
          return;
        }

        const openAiAnswer = await this.chatService.sendMessage(
          chatId,
          userMessageText,
        );
        console.log('openAoiAnswer', openAiAnswer);
        if (ctx.message.voice) {
          console.log('[onMessage] Responding with voice message');
          await sendVoiceResponse(this.bot, chatId, openAiAnswer);
        } else {
          console.log('[onMessage] Responding with text message');
          await sendMessage(this.bot, chatId, openAiAnswer);
        }
      } catch (error) {
        console.error('[onMessage] Error processing message:', error);
        await ctx.reply('Произошла ошибка при обработке сообщения.');
      }
    });

    this.bot.start();
    console.log('[TelegramService] Telegram Bot (grammy) запущен!');
  }

  onModuleInit() {
    console.log('[TelegramService] Nest Telegram Service initialized.');
  }
}
