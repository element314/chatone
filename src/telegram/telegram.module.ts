import { forwardRef, Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { ChatModule } from '../chat/chat.module';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [ChatModule, forwardRef(() => WebsocketModule)],
  providers: [TelegramService],
  exports: [TelegramService],
})
export class TelegramModule {}
