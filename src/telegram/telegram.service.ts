import { Injectable, OnModuleInit } from '@nestjs/common';
import { Bot } from 'grammy';
import { ChatService } from '../chat/chat.service';
import { TtsService } from '../tts/tts.service';
import { setupBot } from './telegram.bot';
import { messages } from './telegram.messages';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!TELEGRAM_BOT_TOKEN) {
  throw new Error(messages.error.tokenMissing);
}

@Injectable()
export class TelegramService implements OnModuleInit {
  private bot: Bot;
  private botStarted = false;

  constructor(
    private readonly chatService: ChatService,
    private readonly ttsService: TtsService,
  ) {
    this.bot = new Bot(TELEGRAM_BOT_TOKEN);
  }

  onModuleInit() {
    if (!this.botStarted) {
      console.log(messages.info.botStarted);
      this.botStarted = true;
    }
    setupBot(this.bot, this.chatService, this.ttsService);
    this.bot.start();
  }
}
