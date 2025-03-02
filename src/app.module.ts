import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { config } from 'dotenv';

// Загружаем переменные окружения
console.log(
  'Подключение к БД:',
  process.env.POSTGRES_HOST,
  process.env.POSTGRES_DB,
);

config({
  path: process.env.NODE_ENV === 'production' ? '.env.prod' : '.env.dev',
});

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { TelegramModule } from './telegram/telegram.module';
import { TtsService } from './tts/tts.service';
import { TtsModule } from './tts/tts.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.POSTGRES_HOST,
      port: Number(process.env.POSTGRES_PORT),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      entities: [join(__dirname, '**', '*.entity.{ts,js}')],
      synchronize: false,
      migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
      migrationsRun: true,
    }),
    ChatModule,
    TelegramModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    TtsModule,
  ],
  controllers: [AppController],
  providers: [AppService, TtsService],
})
export class AppModule {}
