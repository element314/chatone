import { Injectable, OnModuleInit } from '@nestjs/common';
import { Bot, Context } from 'grammy';
import { ChatService } from '../chat/chat.service';
import {
  sanitizeHtmlForTelegram,
  splitHtmlMessage,
} from './helpers/convertToTelegramFormat';
import { transcribeVoiceMessage } from './helpers/transcribeVoice';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_BOT_TOKEN) {
  throw new Error('TELEGRAM_BOT_TOKEN is not defined');
}
async function sendMessage(bot: Bot<Context>, chatId: string, text: string) {
  const MAX_LENGTH = 4000;
  const sanitized = sanitizeHtmlForTelegram(text);
  console.log('Sanitized text:', sanitized);
  const parts =
    sanitized.length > MAX_LENGTH
      ? splitHtmlMessage(sanitized, MAX_LENGTH)
      : [sanitized];
  console.log('Message parts:', parts);

  for (const part of parts) {
    if (part.trim() !== '') {
      // проверяем, что часть не пустая
      await bot.api.sendMessage(chatId, part, { parse_mode: 'HTML' });
    } else {
      console.log('Skipping empty message part');
    }
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
          // Голосовое сообщение: транскрибируем его, используя ctx.getFile()
          userMessageText = await transcribeVoiceMessage(ctx);
          console.log('userMessageText', userMessageText);
          await sendMessage(
            this.bot,
            chatId,
            `Транскрибация: ${userMessageText}`,
          );
        } else if (ctx.message.text) {
          userMessageText = ctx.message.text;
        } else {
          return;
        }

        // Передаём в ChatService флаг storeUserMessage: false для голосовых, true для текстовых
        const openAiAnswer = await this.chatService.sendMessage(
          chatId,
          userMessageText,
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
