import type { EmojiData, EmojiDataCache } from "../types";
import { getStorage, setStorage } from "../utils/storage";
import * as $ from "../utils/validate";

const DEFAULT_CACHE_NAME = "frimousse/data";

export const validateEmojiData = $.object<EmojiData>({
  locale: $.string,
  emojis: $.naiveArray(
    $.object({
      emoji: $.string,
      category: $.number,
      label: $.string,
      version: $.number,
      tags: $.naiveArray($.string),
      countryFlag: $.optional($.boolean as $.Validator<true>),
      skins: $.optional(
        $.object({
          light: $.string,
          "medium-light": $.string,
          medium: $.string,
          "medium-dark": $.string,
          dark: $.string,
        }),
      ),
    }),
  ),
  categories: $.naiveArray(
    $.object({
      index: $.number,
      label: $.string,
    }),
  ),
  skinTones: $.object({
    light: $.string,
    "medium-light": $.string,
    medium: $.string,
    "medium-dark": $.string,
    dark: $.string,
  }),
});

export type CreateEmojiDataCacheOptions = {
  /**
   * The prefix used for the cache's `localStorage` keys, which are of the form
   * `${name}/${locale}`.
   *
   * @default "frimousse/data"
   */
  name?: string;
};

/**
 * Creates a `localStorage`-backed cache of {@link EmojiData} entries, keyed by
 * locale. This is the cache used internally by `defaultEmojiDataResolver`, and
 * it can be used to persist the data resolved by a custom
 * {@link EmojiDataResolver} across page loads.
 *
 * Each entry can carry a piece of metadata of your choosing (a version, a
 * timestamp, an ETag…), used to decide whether the cached data is still fresh.
 *
 * Creating a cache doesn't touch `localStorage`, so it's safe to do at the top
 * level of a module, including when server-side rendering.
 *
 * @example
 * ```ts
 * const cache = createEmojiDataCache<{ version: number }>({ name: "my-app/emoji-data" });
 *
 * async function resolveEmojiData(locale, options) {
 *   const cached = cache.get(locale);
 *
 *   if (cached && cached.metadata.version === VERSION) {
 *     return cached.data;
 *   }
 *
 *   const data = await fetchMyEmojiData(locale, options);
 *
 *   cache.set(locale, data, { version: VERSION });
 *
 *   return data;
 * }
 * ```
 */
export function createEmojiDataCache<M = undefined>({
  name = DEFAULT_CACHE_NAME,
}: CreateEmojiDataCacheOptions = {}): EmojiDataCache<M> {
  const prefix = `${name}/`;
  const validateEntry = $.object<{ data: EmojiData; metadata: M }>({
    data: validateEmojiData,
    // The metadata is opaque, it's up to the resolver to make sense of it
    metadata: (metadata) => metadata as M,
  });

  return {
    get(locale) {
      try {
        return getStorage(localStorage, `${prefix}${locale}`, validateEntry);
      } catch {
        // See below
        return null;
      }
    },

    set(locale, data, ...[metadata]) {
      try {
        setStorage(localStorage, `${prefix}${locale}`, { data, metadata });
      } catch {
        // Caching is best-effort: it can fail if `localStorage` is unavailable
        // (e.g. when server-side rendering) or full, in which case the data is
        // simply not cached.
      }
    },

    delete(locale) {
      try {
        localStorage.removeItem(`${prefix}${locale}`);
      } catch {
        // See above
      }
    },

    clear() {
      try {
        for (const key of Object.keys(localStorage)) {
          if (key.startsWith(prefix)) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        // See above
      }
    },
  };
}
