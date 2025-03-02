export const messages = {
  success: {
    start: '✅ Успех: Привет! Я бот на NestJS!',
    transcriptionComplete: '✅ Успех: Транскрипция завершена',
    messageReceived: '✅ Успех: сообщение получено',
  },
  error: {
    processing: '⚠️ Ошибка: Произошла ошибка при обработке сообщения.',
    download: '⚠️ Ошибка: Не удалось скачать файл.',
    transcription: '⚠️ Ошибка: Не удалось обработать голосовое сообщение.',
    tokenMissing: '❌ Ошибка: TELEGRAM_BOT_TOKEN не задан',
    invalidResponse: '❌ Ошибка: Неверный формат ответа от OpenAI API',
    transcriptionProcessing: '❌ Ошибка при транскрипции:',
    transcriptionFailure: '❌ Ошибка в transcribeVoiceMessage:',
  },
  warning: {
    largeFile:
      '⚠️ Предупреждение: Голосовое сообщение слишком большое для обработки (максимум 20 MB).',
    fileDeletion: '⚠️ Не удалось удалить временный файл:',
  },
  info: {
    botStarted: 'ℹ️ Информация: Telegram Bot запущен!',
    userMessage: (messageType: string, messageText: string) =>
      `📝 Сообщение пользователя (${messageType}): ${messageText}`,
    sentVoiceMessage: '📤 Голосовое сообщение отправлено пользователю',
    sentTextMessage: (resMessage: string) =>
      `📤 Ответ пользователю: ${resMessage}`,
    gotNewMessage: '🚧---Получено новое сообщение---🚧',
  },
  transcription: {
    result: '📝 Транскрипция:',
    startTranscript: 'ℹ️ Начало транскрибации',
  },
};
