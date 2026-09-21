import type {
  EmojiDataEmoji,
  EmojiDataResolver,
  EmojiDetails,
  Locale,
} from "../types";
import { defaultEmojiDataResolver, validateLocale } from "./emoji";
import { getCachedEmojiData } from "./emoji-data-store";

export type GetEmojiDetailsOptions = {
  locale?: Locale;
  emojiVersion?: number;
  emojibaseUrl?: string;
  resolveEmojiData?: EmojiDataResolver;
};

const indexes = new WeakMap<EmojiDataEmoji[], Map<string, EmojiDataEmoji>>();

/**
 * Reads localized metadata already loaded by a picker or `useEmojiDetails`.
 * Never loads data. Missing data and unknown emojis return undefined.
 * Skin-tone variants return their base entry.
 */
export function getEmojiDetails(
  emoji: string,
  {
    locale = "en",
    emojiVersion,
    emojibaseUrl,
    resolveEmojiData,
  }: GetEmojiDetailsOptions = {},
): EmojiDetails | undefined {
  const resolver =
    resolveEmojiData === defaultEmojiDataResolver
      ? undefined
      : resolveEmojiData;
  const data = getCachedEmojiData(resolver ? locale : validateLocale(locale), {
    emojiVersion,
    emojibaseUrl,
    resolveEmojiData: resolver,
  });

  return data ? findEmojiDetails(emoji, data.emojis) : undefined;
}

export function findEmojiDetails(
  emoji: string,
  emojis: EmojiDataEmoji[],
): EmojiDetails | undefined {
  let index = indexes.get(emojis);

  if (!index) {
    index = new Map<string, EmojiDataEmoji>();

    for (const emoji of emojis) {
      index.set(getKey(emoji.emoji), emoji);

      for (const alias of [
        ...Object.values(emoji.skins ?? {}),
        ...(emoji.aliases ?? []),
      ]) {
        const key = getKey(alias);

        if (!index.has(key)) {
          index.set(key, emoji);
        }
      }
    }

    indexes.set(emojis, index);
  }

  return index.get(getKey(emoji));
}

function getKey(emoji: string) {
  return emoji.replace(/[\uFE0E\uFE0F]/gu, "");
}
