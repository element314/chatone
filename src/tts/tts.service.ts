import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import OpenAI from 'openai';
import { messages } from './tts.messages';

@Injectable()
export class TtsService {
  private ttsOpenai: OpenAI;
  private TMP_VOICE_DIR = '/tmp/voice-responses';

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      console.error(messages.error.apiKeyMissing);
    }

    this.ttsOpenai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 60000,
    });

    if (!fs.existsSync(this.TMP_VOICE_DIR)) {
      try {
        fs.mkdirSync(this.TMP_VOICE_DIR, { recursive: true });
        console.log(messages.info.tmpDirCreated, this.TMP_VOICE_DIR);
      } catch (error) {
        console.error(messages.error.tmpDirCreation, error);
      }
    }
  }

  async generateOggFile(text: string): Promise<string> {
    try {
      if (!text || text.trim() === '') {
        throw new Error(messages.error.emptyText);
      }

      const maxLength = 4096;
      if (text.length > maxLength) {
        console.warn(messages.warning.textTooLong(text.length, maxLength));
        text = text.substring(0, maxLength);
      }

      const ttsResponse = await this.ttsOpenai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: text,
        response_format: 'opus',
      });

      const buffer = Buffer.from(await ttsResponse.arrayBuffer());
      const filePath = path.join(
        this.TMP_VOICE_DIR,
        `response_${Date.now()}.ogg`,
      );

      await fs.promises.writeFile(filePath, buffer);
      console.log(messages.info.ttsFileSaved, filePath);

      return filePath;
    } catch (error) {
      console.error(messages.error.ttsGeneration, error);
      throw error;
    }
  }

  async removeFile(filePath: string) {
    if (!filePath) {
      console.warn(messages.warning.noFilePath);
      return;
    }

    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        console.log(messages.info.tempFileDeleted, filePath);
      } else {
        console.warn(messages.warning.fileNotExist, filePath);
      }
    } catch (error) {
      console.error(messages.error.fileDeletion, error);
    }
  }
}
