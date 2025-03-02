import { Context } from 'grammy';
import * as fs from 'fs';
import * as path from 'path';
import { pipeline } from 'stream/promises';
import OpenAI from 'openai';
import { messages } from './telegram.messages';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000,
});
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const TMP_DIR = '/tmp/voice-messages';

export async function transcribeVoiceMessage(ctx: Context): Promise<string> {
  try {
    if (!ctx.message.voice) {
      return messages.error.transcription;
    }

    if (!fs.existsSync(TMP_DIR)) {
      fs.mkdirSync(TMP_DIR, { recursive: true });
    }

    const file = await ctx.getFile();
    if (!file.file_path) {
      return messages.error.download;
    }

    if (file.file_size && file.file_size > MAX_FILE_SIZE) {
      return messages.warning.largeFile;
    }

    const fileUrl = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
    const localFilePath = path.join(TMP_DIR, `${file.file_unique_id}.ogg`);

    const response = await fetch(fileUrl);
    if (!response.ok || !response.body) {
      return messages.error.download;
    }

    await pipeline(response.body, fs.createWriteStream(localFilePath));

    let transcription: string;
    try {
      console.log(messages.transcription.startTranscript);
      const transcriptionResponse = await openai.audio.transcriptions.create({
        file: fs.createReadStream(localFilePath),
        model: 'whisper-1',
        response_format: 'text',
      });

      if (typeof transcriptionResponse !== 'string') {
        console.error(messages.error.invalidResponse, transcriptionResponse);
        transcription = messages.error.transcription;
      } else {
        transcription = transcriptionResponse;
      }
    } catch (error: unknown) {
      console.error(
        messages.error.transcriptionProcessing,
        error instanceof Error ? error.message : error,
      );
      transcription = messages.error.transcription;
    } finally {
      try {
        fs.unlinkSync(localFilePath);
      } catch (unlinkError) {
        console.warn(messages.warning.fileDeletion, unlinkError);
      }
    }

    console.log(messages.success.transcriptionComplete);
    return `${transcription}`;
  } catch (error: unknown) {
    console.error(
      messages.error.transcriptionFailure,
      error instanceof Error ? error.message : error,
    );
    return messages.error.transcription;
  }
}
