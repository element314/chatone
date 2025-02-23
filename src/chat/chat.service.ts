import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from './entities/chat.entity';
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
   * Отправка запроса в OpenAI ChatCompletion с историей переписки.
   * @param chatId - идентификатор чата (например, из Telegram)
   * @param prompt - новое сообщение пользователя
   */
  async sendMessage(chatId: string, prompt: string): Promise<string> {
    await this.chatRepository.save({
      chatId,
      role: 'user',
      content: prompt,
    });

    let conversationHistory = await this.chatRepository.find({
      where: { chatId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
    conversationHistory = conversationHistory.reverse();

    const messages = conversationHistory.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Системное сообщение с инструкцией
    messages.unshift({
      role: 'system',
      content:
        'You are a helpful assistant. Answer in HTML format. Wrap any code snippets in <pre> tags and do not unnecessarily escape punctuation. Return your answer as a combination of HTML paragraphs and <pre> blocks, as appropriate.',
    });

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        //@ts-expect-error - исправить!
        messages: messages,
      });

      const assistantReply = completion.choices[0].message.content;

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
