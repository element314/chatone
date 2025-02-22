// src/telegram/telegram.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { ChatService } from '../chat/chat.service';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: Telegraf;

  constructor(private readonly chatService: ChatService) {
    this.bot = new Telegraf(TELEGRAM_BOT_TOKEN);
  }

  onModuleInit() {
    // Команда /start
    this.bot.start((ctx) => ctx.reply('Привет! Я бот на NestJS!'));

    // Любое текстовое сообщение
    this.bot.hears(/.+/i, async (ctx) => {
      const userMessage = ctx.message.text;
      // Получаем chatId из контекста Telegram
      const chatId = String(ctx.chat.id);

      // Передаём chatId и текст пользователя в ChatService
      const openAiAnswer = await this.chatService.sendMessage(
        chatId,
        userMessage,
      );

      // Отправляем ответ
      await ctx.reply(openAiAnswer);
    });

    // Запуск бота
    this.bot
      .launch()
      .then(() => console.log('Telegram Bot запущен!'))
      .catch((err) => console.error('Ошибка запуска бота:', err));
  }
}
