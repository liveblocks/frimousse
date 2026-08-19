import { SKIN_TONES } from "../constants";
import type {
  EmojibaseEmoji,
  EmojibaseEmojiWithGroup,
  EmojibaseMessagesDataset,
  EmojiData,
  EmojiDataEmoji,
  EmojiDataResolver,
  Locale,
  SkinTone,
} from "../types";
import { capitalize } from "../utils/capitalize";
import { isEmojiSupported } from "../utils/is-emoji-supported";
import { getStorage, setStorage } from "../utils/storage";
import * as $ from "../utils/validate";
import { createEmojiDataCache } from "./emoji-data-cache";

const EMOJIBASE_EMOJIS_URL = (baseUrl: string, locale: Locale) =>
  `${baseUrl}/${locale}/data.json`;
const EMOJIBASE_MESSAGES_URL = (baseUrl: string, locale: Locale) =>
  `${baseUrl}/${locale}/messages.json`;

const EMOJIBASE_LOCALES = [
  "bn",
  "da",
  "de",
  "en-gb",
  "en",
  "es-mx",
  "es",
  "et",
  "fi",
  "fr",
  "hi",
  "hu",
  "it",
  "ja",
  "ko",
  "lt",
  "ms",
  "nb",
  "nl",
  "pl",
  "pt",
  "ru",
  "sv",
  "th",
  "uk",
  "vi",
  "zh-hant",
  "zh",
] satisfies Locale[];
const EMOJIBASE_DEFAULT_LOCALE: Locale = "en";

export const SESSION_METADATA_KEY = "frimousse/metadata";

// Prevent EMOJIBASE_LOCALES to be out of sync with Locale
{
  type MissingLocales = Exclude<Locale, (typeof EMOJIBASE_LOCALES)[number]>;
  type AllLocalesPresent = MissingLocales extends never
    ? true
    : `Missing locales: ${MissingLocales}`;
  const _allLocalesPresent: AllLocalesPresent = true;
  _allLocalesPresent;
}

type EmojibaseMetadata = {
  emojisEtag: string | null;
  messagesEtag: string | null;
};

type EmojiSupport = {
  /**
   * The highest Emoji version the current browser can render.
   */
  emojiVersion: number;

  /**
   * Whether the current browser can render country flags.
   */
  countryFlags: boolean;
};

type SessionMetadata = EmojiSupport & {
  /**
   * The locales whose cached data was already revalidated during this session,
   * to only check ETags once per locale per session.
   */
  revalidated: string[];
};

const emojibaseCache = createEmojiDataCache<EmojibaseMetadata>();

async function fetchEtag(url: string, signal?: AbortSignal) {
  try {
    const response = await fetch(url, { method: "HEAD", signal });

    return response.headers.get("etag");
  } catch (_) {
    return null;
  }
}

async function fetchEmojibaseData(
  baseUrl: string,
  locale: Locale,
  signal?: AbortSignal,
) {
  const [{ emojis, emojisEtag }, { messages, messagesEtag }] =
    await Promise.all([
      fetch(EMOJIBASE_EMOJIS_URL(baseUrl, locale), { signal }).then(
        async (response) => {
          return {
            emojis: (await response.json()) as EmojibaseEmoji[],
            emojisEtag: response.headers.get("etag"),
          };
        },
      ),
      fetch(EMOJIBASE_MESSAGES_URL(baseUrl, locale), { signal }).then(
        async (response) => {
          return {
            messages: (await response.json()) as EmojibaseMessagesDataset,
            messagesEtag: response.headers.get("etag"),
          };
        },
      ),
    ]);

  return {
    emojis,
    messages,
    emojisEtag,
    messagesEtag,
  };
}

async function fetchEmojibaseEtags(
  baseUrl: string,
  locale: Locale,
  signal?: AbortSignal,
) {
  const [emojisEtag, messagesEtag] = await Promise.all([
    fetchEtag(EMOJIBASE_EMOJIS_URL(baseUrl, locale), signal),
    fetchEtag(EMOJIBASE_MESSAGES_URL(baseUrl, locale), signal),
  ]);

  return {
    emojisEtag,
    messagesEtag,
  };
}

export function getEmojibaseSkinToneVariations(
  emoji: EmojibaseEmojiWithGroup,
): Record<Exclude<SkinTone, "none">, string> | undefined {
  if (!emoji.skins) {
    return;
  }

  const skinToneVariations = emoji.skins.filter(
    (emoji) => typeof emoji.tone === "number",
  );

  return skinToneVariations.reduce(
    (result, emoji) => {
      const skinTone = SKIN_TONES[emoji.tone as number]!;

      result[skinTone as Exclude<SkinTone, "none">] = emoji.emoji;

      return result;
    },
    {} as Record<Exclude<SkinTone, "none">, string>,
  );
}

async function fetchEmojiData(
  baseUrl: string,
  locale: Locale,
  signal?: AbortSignal,
): Promise<EmojiData> {
  const { emojis, emojisEtag, messages, messagesEtag } =
    await fetchEmojibaseData(baseUrl, locale, signal);
  const countryFlagsSubgroup = messages.subgroups.find(
    (subgroup) =>
      subgroup.key === "country-flag" || subgroup.key === "subdivision-flag",
  );

  // Filter out the component/modifier category and its emojis
  const filteredGroups = messages.groups.filter(
    (group) => group.key !== "component",
  );
  const filteredEmojis = emojis.filter((emoji) => {
    return "group" in emoji;
  }) as EmojibaseEmojiWithGroup[];

  const categories = filteredGroups.map((group) => ({
    index: group.order,
    label: capitalize(group.message),
  }));
  const skinTones = messages.skinTones.reduce(
    (skinTones, skinTone) => {
      skinTones[skinTone.key] = capitalize(skinTone.message);

      return skinTones;
    },
    {} as Record<SkinTone, string>,
  );

  const formattedEmojis = filteredEmojis.map((emoji) => {
    return {
      emoji: emoji.emoji,
      category: emoji.group,
      version: emoji.version,
      label: capitalize(emoji.label),
      tags: emoji.tags ?? [],
      countryFlag:
        (countryFlagsSubgroup &&
          emoji.subgroup === countryFlagsSubgroup.order) ||
        undefined,
      skins: getEmojibaseSkinToneVariations(emoji),
    } satisfies EmojiDataEmoji;
  });

  const emojiData: EmojiData = {
    locale,
    emojis: formattedEmojis,
    categories,
    skinTones,
  };

  emojibaseCache.set(locale, emojiData, { emojisEtag, messagesEtag });

  return emojiData;
}

function getEmojiSupport(
  emojis: EmojiDataEmoji[],
  emojiVersion?: number,
): EmojiSupport {
  const versionEmojis = new Map<number, string>();

  for (const emoji of emojis) {
    if (!versionEmojis.has(emoji.version)) {
      versionEmojis.set(emoji.version, emoji.emoji);
    }
  }

  const descendingVersions = [...versionEmojis.keys()].sort((a, b) => b - a);
  const highestVersion = descendingVersions[0] ?? 0;

  const supportsCountryFlags = isEmojiSupported("🇪🇺");

  if (typeof emojiVersion === "number") {
    return {
      emojiVersion,
      countryFlags: supportsCountryFlags,
    };
  }

  for (const version of descendingVersions) {
    const emoji = versionEmojis.get(version)!;

    if (isEmojiSupported(emoji)) {
      return {
        emojiVersion: version,
        countryFlags: supportsCountryFlags,
      };
    }
  }

  return {
    emojiVersion: highestVersion,
    countryFlags: supportsCountryFlags,
  };
}

const validateSessionMetadata = $.object<SessionMetadata>({
  emojiVersion: $.number,
  countryFlags: $.boolean,
  revalidated: $.naiveArray($.string),
});

/**
 * The {@link EmojiDataResolver} used by default, which fetches, transforms, and
 * caches {@link https://emojibase.dev/docs/datasets/ | Emojibase data}, and
 * filters out emojis the current browser can't render.
 *
 * Use it to delegate the locales a custom resolver doesn't handle itself.
 *
 * @example
 * ```tsx
 * import { defaultEmojiDataResolver, EmojiPicker } from "frimousse";
 *
 * <EmojiPicker.Root
 *   locale="tr"
 *   resolveEmojiData={(locale, options) =>
 *     locale === "tr" ? turkishEmojiData : defaultEmojiDataResolver(locale, options)
 *   }
 * >
 * ```
 */
export const defaultEmojiDataResolver: EmojiDataResolver = async (
  locale,
  { emojiVersion, emojibaseUrl, signal } = {},
) => {
  const emojibaseLocale = validateLocale(locale);
  const baseUrl =
    typeof emojibaseUrl === "string"
      ? emojibaseUrl
      : `https://cdn.jsdelivr.net/npm/emojibase-data@${typeof emojiVersion === "number" ? Math.floor(emojiVersion) : "latest"}`;
  const sessionMetadata = getStorage<SessionMetadata>(
    sessionStorage,
    SESSION_METADATA_KEY,
    validateSessionMetadata,
  );
  const cached = emojibaseCache.get(emojibaseLocale);

  let data: EmojiData;

  if (!cached) {
    // No cached data
    data = await fetchEmojiData(baseUrl, emojibaseLocale, signal);
  } else if (sessionMetadata?.revalidated.includes(emojibaseLocale)) {
    // ETags are used to check if the cached data is up-to-date but only once
    // per locale per session, so if this locale was already revalidated during
    // this session, the cached data can be used
    data = cached.data;
  } else {
    // Check ETags to see if the cached data is up-to-date,
    // but if that fails, the possibly-stale cached data is used
    try {
      const { emojisEtag, messagesEtag } = await fetchEmojibaseEtags(
        baseUrl,
        emojibaseLocale,
        signal,
      );

      data =
        !emojisEtag ||
        !messagesEtag ||
        emojisEtag !== cached.metadata.emojisEtag ||
        messagesEtag !== cached.metadata.messagesEtag
          ? await fetchEmojiData(baseUrl, emojibaseLocale, signal)
          : cached.data;
    } catch {
      data = cached.data;
    }
  }

  // Detect the browser's Emoji support if needed, and mark this locale as
  // revalidated for the rest of the session
  const support: EmojiSupport =
    sessionMetadata ?? getEmojiSupport(data.emojis, emojiVersion);
  const revalidated = sessionMetadata?.revalidated ?? [];

  setStorage(sessionStorage, SESSION_METADATA_KEY, {
    ...support,
    revalidated: revalidated.includes(emojibaseLocale)
      ? revalidated
      : [...revalidated, emojibaseLocale],
  } satisfies SessionMetadata);

  // Filter out unsupported emojis
  const filteredEmojis = data.emojis.filter((emoji) => {
    const isSupportedVersion = emoji.version <= support.emojiVersion;

    return emoji.countryFlag
      ? isSupportedVersion && support.countryFlags
      : isSupportedVersion;
  });

  return {
    locale: emojibaseLocale,
    emojis: filteredEmojis,
    categories: data.categories,
    skinTones: data.skinTones,
  };
};

export function validateLocale(locale: string): Locale {
  if (!EMOJIBASE_LOCALES.includes(locale as Locale)) {
    console.warn(
      `Locale "${locale}" is not supported, using "${EMOJIBASE_DEFAULT_LOCALE}" instead.`,
    );

    return EMOJIBASE_DEFAULT_LOCALE;
  }

  return locale as Locale;
}

export function validateSkinTone(skinTone: string): SkinTone {
  if (!SKIN_TONES.includes(skinTone as SkinTone)) {
    console.warn(`Skin tone "${skinTone}" is not valid, using "none" instead.`);

    return "none";
  }

  return skinTone as SkinTone;
}
