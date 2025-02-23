import { Injectable, OnModuleInit } from '@nestjs/common';
import { Bot, Context } from 'grammy';
import { ChatService } from '../chat/chat.service';
import {
  sanitizeHtmlForTelegram,
  splitHtmlMessage,
} from './helpers/convertToTelegramFormat';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is not defined');
}

/**
 * Отправляет сообщение, если оно длинное, разбивает его на фрагменты,
 * корректно добавляя закрывающие и открывающие теги между фрагментами.
 */
async function sendMessage(bot: Bot<Context>, chatId: string, text: string) {
  const MAX_LENGTH = 4000;
  const sanitized = sanitizeHtmlForTelegram(text);
  const parts =
    sanitized.length > MAX_LENGTH
      ? splitHtmlMessage(sanitized, MAX_LENGTH)
      : [sanitized];
  for (const part of parts) {
    await bot.api.sendMessage(chatId, part, { parse_mode: 'HTML' });
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
        const userMessage = ctx.message.text;
        const chatId = String(ctx.chat.id);
        const openAiAnswer = await this.chatService.sendMessage(
          chatId,
          userMessage,
        );

        await sendMessage(this.bot, chatId, openAiAnswer);
      } catch (error) {
        console.error('Ошибка при обработке сообщения:', error);
        await ctx.reply('Произошла ошибка при обработке сообщения.');
      }
    });

    this.bot.start();
  }

  onModuleInit() {
    console.log('Telegram Bot (grammy) запущен!');
  }
}
