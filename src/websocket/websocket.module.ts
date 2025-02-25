import { forwardRef, Module } from '@nestjs/common';
import { TelegramModule } from '../telegram/telegram.module';
import { WebsocketGateway } from './websocket.gateway';

@Module({
  imports: [
    forwardRef(() => TelegramModule), // <--- позволяет ссылаться назад
  ],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class WebsocketModule { }
