import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { TelegramService } from '../telegram/telegram.service';
import { forwardRef, Inject } from '@nestjs/common';

@WebSocketGateway({ cors: true })
export class WebsocketGateway {
  @WebSocketServer()
  server: Server;

  constructor(
    @Inject(forwardRef(() => TelegramService))
    private readonly telegramService: TelegramService) {}

  broadcastMessage(chatId: string, text: string) {
    this.server.emit('receiveMessage', { chatId, text });
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(
    @MessageBody() message: { chatId: string; text: string },
  ) {
    console.log('Received message from client:', message);
    await this.telegramService.sendRawToTelegram(message.chatId, message.text);

    const response = await this.telegramService.processMessage(
      message.chatId,
      message.text,
    );
    this.server.emit('receiveMessage', {
      chatId: message.chatId,
      text: response,
    });
  }
}
