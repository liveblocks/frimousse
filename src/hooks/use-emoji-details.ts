import { useCallback, useSyncExternalStore } from "react";
import {
  defaultEmojiDataResolver,
  loadEmojiData,
  validateLocale,
} from "../data/emoji";
import {
  getCachedEmojiData,
  getEmojibaseUrl,
  subscribeToEmojiData,
  suspendForEmojiData,
} from "../data/emoji-data-store";
import {
  findEmojiDetails,
  type GetEmojiDetailsOptions,
} from "../data/get-emoji-details";
import type { EmojiDetails } from "../types";

export type UseEmojiDetailsOptions = GetEmojiDetailsOptions;

/**
 * Returns localized metadata, suspending until the shared dataset is loaded.
 * Loading errors reach the nearest error boundary. Unknown emojis return undefined.
 * During server rendering, the nearest Suspense boundary shows its fallback.
 */
export function useEmojiDetails(
  emoji: string,
  {
    locale = "en",
    emojiVersion,
    emojibaseUrl,
    resolveEmojiData,
  }: UseEmojiDetailsOptions = {},
): EmojiDetails | undefined {
  const resolver =
    resolveEmojiData === defaultEmojiDataResolver
      ? undefined
      : resolveEmojiData;
  const dataLocale = resolver ? locale : validateLocale(locale);
  const getSnapshot = useCallback(
    () =>
      getCachedEmojiData(dataLocale, {
        emojiVersion,
        emojibaseUrl,
        resolveEmojiData: resolver,
      })?.emojis,
    [dataLocale, emojiVersion, emojibaseUrl, resolver],
  );
  const emojis = useSyncExternalStore(
    subscribeToEmojiData,
    getSnapshot,
    getServerSnapshot,
  );

  if (!emojis) {
    const options = { emojiVersion, emojibaseUrl, resolveEmojiData: resolver };
    suspendForEmojiData(dataLocale, options, () =>
      resolver
        ? resolver(dataLocale, {
            emojiVersion,
            emojibaseUrl,
          })
        : loadEmojiData(getEmojibaseUrl(options), validateLocale(dataLocale)),
    );
  }

  return findEmojiDetails(emoji, emojis);
}

function getServerSnapshot(): never {
  // Let Suspense render its fallback on the server and load browser data on the client.
  throw new Error("useEmojiDetails only loads emoji data on the client.");
}
