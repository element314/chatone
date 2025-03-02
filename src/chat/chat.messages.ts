export const messages = {
  error: {
    apiKeyMissing: '❌ Ошибка: OPENAI_API_KEY не задан',
    openAiRequest: '❌ Ошибка: Запрос к OpenAI завершился неудачей',
    failedToProcess:
      '⚠️ Ошибка: Не удалось обработать запрос, попробуйте позже',
  },
  info: {
    assistantReply: '📤 Ответ ассистента:',
  },
  system: {
    assistantInstructions:
      'You are a helpful assistant. Answer in HTML format. Wrap any code snippets in <pre> tags and do not unnecessarily escape punctuation. Return your answer as a combination of HTML paragraphs and <pre> blocks, as appropriate.',
  },
};
