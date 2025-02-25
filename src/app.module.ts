import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { TelegramModule } from './telegram/telegram.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebsocketGateway } from './websocket/websocket.gateway';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { WebsocketModule } from './websocket/websocket.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST || 'localhost',
      port: Number(process.env.POSTGRES_PORT) || 5432,
      username: process.env.POSTGRES_USER || 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'postgres',
      database: process.env.POSTGRES_DB || 'chat_db',
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: false, // для разработки, в продакшене лучше отключать
    }),
    ChatModule,
    TelegramModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'), // Папка public
    }),
    WebsocketModule,
  ],
  controllers: [AppController],
  providers: [AppService, WebsocketGateway],
})
export class AppModule {}
