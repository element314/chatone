import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { ChatModule } from '../chat/chat.module';
import { TtsModule } from '../tts/tts.module';

@Module({
  imports: [ChatModule, TtsModule],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
