import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from './entities/chat.entity'; // убедитесь, что путь корректный
import * as dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

@Injectable()
export class ChatService {
  private openai: OpenAI;

  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Отправка запроса в OpenAI ChatCompletion с историей переписки
   * @param chatId - идентификатор чата (например, chatId из Telegram)
   * @param prompt - новое сообщение пользователя
   */
  async sendMessage(chatId: string, prompt: string): Promise<string> {
    // Сохраняем сообщение пользователя
    await this.chatRepository.save({
      chatId,
      role: 'user',
      content: prompt,
    });

    // Получаем историю переписки для данного chatId (например, последние 20 сообщений)
    const conversationHistory = await this.chatRepository.find({
      where: { chatId },
      order: { createdAt: 'ASC' },
      take: 20,
    });
  console.log('conversationHistory', JSON.stringify(conversationHistory));
    // Формируем массив сообщений для OpenAI
    const messages = conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Добавляем системное сообщение в начало (при необходимости)
    messages.unshift({
      role: 'system',
      content: 'You are a helpful assistant.',
    });

    try {
      // Отправляем запрос с историей переписки
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // или другую модель, если требуется
        //@ts-expect-error - исправить!
        messages: messages,
      });

      const assistantReply = completion.choices[0].message.content;

      // Сохраняем ответ ассистента в базу
      await this.chatRepository.save({
        chatId,
        role: 'assistant',
        content: assistantReply,
      });

      return assistantReply;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Ошибка при запросе к OpenAI:', error.message);
      } else {
        console.error('Неизвестная ошибка при запросе к OpenAI:', error);
      }
      throw error;
    }
  }
}

// import { Injectable } from '@nestjs/common';
// import * as dotenv from 'dotenv';
// import OpenAI from 'openai';
//
// dotenv.config();
//
// @Injectable()
// export class ChatService {
//   private openai: OpenAI;
//
//   constructor() {
//     this.openai = new OpenAI({
//       apiKey: process.env.OPENAI_API_KEY,
//     });
//   }
//
//   /**
//    * Отправка запроса в OpenAI ChatCompletion
//    * @param prompt - сообщение пользователя (вопрос)
//    */
//   async sendMessage(prompt: string): Promise<string> {
//     try {
//       // Создаём чат-комплишен
//       const completion = await this.openai.chat.completions.create({
//         model: 'gpt-4o-mini',
//         messages: [
//           { role: 'system', content: 'You are a helpful assistant.' },
//           { role: 'user', content: prompt },
//         ],
//       });
//       // console.log(JSON.stringify(completion));
//       // Возвращаем контент первого (0-го) варианта ответа
//       return completion.choices[0].message.content;
//     } catch (error: unknown) {
//       if (error instanceof Error) {
//         console.error('Ошибка при запросе к OpenAI:', error.message);
//       } else {
//         console.error('Неизвестная ошибка при запросе к OpenAI:', error);
//       }
//       throw error;
//     }
//   }
// }
