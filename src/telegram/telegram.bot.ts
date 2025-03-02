import { Bot, InputFile } from 'grammy';
import { ChatService } from '../chat/chat.service';
import { TtsService } from '../tts/tts.service';
import { transcribeVoiceMessage } from './telegram.voice';
import { messages } from './telegram.messages';
import {
  sanitizeHtmlForTelegram,
  splitHtmlMessage,
} from './helpers/convertToTelegramFormat';

export function setupBot(
  bot: Bot,
  chatService: ChatService,
  ttsService: TtsService,
) {
  bot.command('start', async (ctx) => {
    await ctx.reply(messages.success.start);
  });

  bot.on('message', async (ctx) => {
    console.log(messages.info.gotNewMessage);
    try {
      const chatId = String(ctx.chat.id);
      let userMessageText: string;
      let messageType = 'текстовое сообщение';

      if (ctx.message.voice) {
        userMessageText = await transcribeVoiceMessage(ctx);
        messageType = 'голосовое сообщение';
        console.log(messages.info.userMessage(messageType, userMessageText));
        await sendTextMessage(
          bot,
          chatId,
          `${messages.transcription.result} ${userMessageText}`,
        );
      } else if (ctx.message.text) {
        userMessageText = ctx.message.text;
        console.log(messages.info.userMessage(messageType, userMessageText));
      } else {
        return;
      }

      const openAiAnswer = await chatService.sendMessage(
        chatId,
        userMessageText,
      );

      console.log(messages.info.sentTextMessage(openAiAnswer));

      if (ctx.message.voice) {
        await sendVoiceResponse(bot, ttsService, chatId, openAiAnswer);
      } else {
        await sendTextMessage(bot, chatId, openAiAnswer);
      }
    } catch (error) {
      console.error(messages.error.processing, error);
      await ctx.reply(messages.error.processing);
    }
  });

  async function sendTextMessage(bot: Bot, chatId: string, text: string) {
    try {
      const sanitizedText = sanitizeHtmlForTelegram(text);
      const messagesParts = splitHtmlMessage(sanitizedText, 4000);

      for (const msg of messagesParts) {
        await bot.api.sendMessage(chatId, msg, { parse_mode: 'HTML' });
      }
    } catch (error) {
      console.error(messages.error.processing, error);
    }
  }

  async function sendVoiceResponse(
    bot: Bot,
    ttsService: TtsService,
    chatId: string,
    text: string,
  ) {
    const filePath = await ttsService.generateOggFile(text);
    await bot.api.sendVoice(chatId, new InputFile(filePath));
    console.log(messages.info.sentVoiceMessage);
    await ttsService.removeFile(filePath);
  }
}
