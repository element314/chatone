/*
 * Создать решение аналогичное https://github.com/Latand/formatter-chatgpt-telegram/tree/main/chatgpt_md_converter
 * только для node js и опубликовать пакет npm. Текущее решение можно использовать
 * исключительно как временное
 * */

const ALLOWED_TAGS = new Set([
  'b',
  'strong',
  'i',
  'em',
  'code',
  'pre',
  's',
  'strike',
  'del',
  'u',
  'a',
]);

/**
 * Очищает HTML от неподдерживаемых тегов:
 * – Удаляет <!DOCTYPE> и HTML-комментарии.
 * – Удаляет теги, не поддерживаемые Telegram.
 * – Сохраняет разрешённые теги (но не атрибуты).
 */
export function sanitizeHtmlForTelegram(text: string): string {
  let cleaned = text
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    // Удаляем нежелательные теги (без попытки сохранить их содержимое)
    .replace(
      /<\/?(html|head|meta|title|link|script|style|iframe|form|input|textarea|button|select|option|svg|canvas|audio|video)[^>]*>/gi,
      '',
    );

  // Оставляем только разрешённые теги (сохраняя их содержимое)
  cleaned = cleaned.replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (match, tag) => {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    if (!tag || tag.trim() === '') {
      return '';
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call,@typescript-eslint/no-unsafe-member-access
    return ALLOWED_TAGS.has(tag.toLowerCase()) ? match : '';
  });
  return cleaned.trim();
}

/**
 * Разбивает HTML-текст на фрагменты так, чтобы каждый фрагмент не превышал maxLength символов,
 * при этом сохраняется баланс разрешённых тегов (<pre>, <code> и т.п.).
 *
 * Для простоты реализован парсинг по регулярному выражению.
 */
export function splitHtmlMessage(text: string, maxLength: number): string[] {
  interface Token {
    type: 'tag' | 'text';
    content: string;
    tagName?: string;
    isOpening?: boolean;
    isClosing?: boolean;
  }

  const tokens: Token[] = [];
  // Разбиваем по тегам – простое регулярное выражение
  const parts = text.split(/(<[^>]+>)/g).filter((part) => part.length > 0);
  for (const part of parts) {
    if (part.startsWith('<') && part.endsWith('>')) {
      // Попытаемся извлечь имя тега
      const isClosing = part.startsWith('</');
      const tagMatch = part.match(/^<\/?([a-z0-9]+)/i);
      const tagName = tagMatch ? tagMatch[1].toLowerCase() : '';
      tokens.push({
        type: 'tag',
        content: part,
        tagName,
        isOpening: !isClosing,
        isClosing,
      });
    } else {
      tokens.push({ type: 'text', content: part });
    }
  }

  const result: string[] = [];
  let currentFragment = '';
  const openTags: string[] = []; // стек для открытых тегов

  // Формирует префикс из открытых тегов (без атрибутов)
  const getOpenTagsPrefix = () => openTags.map((tag) => `<${tag}>`).join('');
  // Формирует строку закрывающих тегов (в обратном порядке)
  const getCloseTagsSuffix = () =>
    openTags
      .slice()
      .reverse()
      .map((tag) => `</${tag}>`)
      .join('');

  const flushFragment = () => {
    // Добавляем фрагмент только если он не пустой (после trim)
    if (currentFragment.trim().length > 0) {
      result.push(currentFragment + getCloseTagsSuffix());
    }
    // Новый фрагмент начинается с повторного открытия текущих тегов
    currentFragment = getOpenTagsPrefix();
  };

  for (const token of tokens) {
    const tokenContent = token.content;

    // Если currentFragment пустой и сам токен длиннее maxLength,
    // разбиваем токен на части
    if (currentFragment.length === 0 && tokenContent.length > maxLength) {
      let start = 0;
      while (start < tokenContent.length) {
        const chunk = tokenContent.slice(start, start + maxLength);
        result.push(getOpenTagsPrefix() + chunk + getCloseTagsSuffix());
        start += maxLength;
      }
      continue;
    }

    // Если добавление токена превышает лимит, сбрасываем текущий фрагмент
    if (currentFragment.length + tokenContent.length > maxLength) {
      flushFragment();
    }
    currentFragment += tokenContent;

    // Если токен – тег и он разрешён, обновляем стек openTags
    if (
      token.type === 'tag' &&
      token.tagName &&
      ALLOWED_TAGS.has(token.tagName)
    ) {
      if (token.isOpening) {
        openTags.push(token.tagName);
      } else if (token.isClosing) {
        const idx = openTags.lastIndexOf(token.tagName);
        if (idx !== -1) {
          openTags.splice(idx, 1);
        }
      }
    }
  }
  if (currentFragment.trim().length > 0) {
    result.push(currentFragment);
  }
  return result;
}
