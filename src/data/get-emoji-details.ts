import type {
  EmojiDataEmoji,
  EmojiDataResolver,
  EmojiDetails,
  Locale,
} from "../types";
import { DEFAULT_EMOJIBASE_URL, loadEmojiData, validateLocale } from "./emoji";

export type GetEmojiDetailsOptions = {
  locale?: Locale;
  emojibaseUrl?: string;
  resolveEmojiData?: EmojiDataResolver;
  signal?: AbortSignal;
};

const indexes = new WeakMap<EmojiDataEmoji[], Map<string, EmojiDataEmoji>>();

/**
 * Looks up localized metadata without filtering for browser support.
 * Skin-tone variants return their base entry. Unknown emojis return undefined.
 */
export async function getEmojiDetails(
  emoji: string,
  {
    locale = "en",
    emojibaseUrl,
    resolveEmojiData,
    signal,
  }: GetEmojiDetailsOptions = {},
): Promise<EmojiDetails | undefined> {
  signal?.throwIfAborted();

  const data = resolveEmojiData
    ? await resolveEmojiData(locale, { emojibaseUrl, signal })
    : await loadEmojiData(
        emojibaseUrl ?? DEFAULT_EMOJIBASE_URL,
        validateLocale(locale),
        signal,
      );

  signal?.throwIfAborted();
  let index = indexes.get(data.emojis);

  if (!index) {
    index = new Map<string, EmojiDataEmoji>();

    for (const emoji of data.emojis) {
      index.set(getKey(emoji.emoji), emoji);

      if (!emoji.skins) {
        continue;
      }

      for (const skin of Object.values(emoji.skins)) {
        const key = getKey(skin);

        if (!index.has(key)) {
          index.set(key, emoji);
        }
      }
    }

    indexes.set(data.emojis, index);
  }

  return index.get(getKey(emoji));
}

function getKey(emoji: string) {
  return emoji.replace(/[\uFE0E\uFE0F]/gu, "");
}
