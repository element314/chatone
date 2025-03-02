import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from './entities/chat.entity';
import * as dotenv from 'dotenv';
import OpenAI from 'openai';
import { messages } from './chat.messages';

dotenv.config();

@Injectable()
export class ChatService {
  private openai: OpenAI;

  constructor(
    @InjectRepository(Chat)
    private chatRepository: Repository<Chat>,
  ) {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  async sendMessage(chatId: string, prompt: string): Promise<string> {
    try {
      await this.chatRepository.save({ chatId, role: 'user', content: prompt });

      let conversationHistory = await this.chatRepository.find({
        where: { chatId },
        order: { createdAt: 'DESC' },
        take: 50,
      });
      conversationHistory = conversationHistory.reverse();

      const messagesData = conversationHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      messagesData.unshift({
        role: 'system',
        content: messages.system.assistantInstructions,
      });

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        //@ts-expect-error
        messages: messagesData,
      });

      const assistantReply = completion.choices[0]?.message?.content ?? '';
      console.log(messages.info.assistantReply, assistantReply);

      await this.chatRepository.save({
        chatId,
        role: 'assistant',
        content: assistantReply,
      });
      return assistantReply;
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error(messages.error.openAiRequest, error.message);
      } else {
        console.error(messages.error.openAiRequest, error);
      }
      throw error;
    }
  }
}
