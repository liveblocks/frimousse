import { SKIN_TONES } from "../constants";
import type {
  EmojiData,
  EmojiDataEmoji,
  EmojibaseEmoji,
  EmojibaseEmojiWithGroup,
  EmojibaseMessagesDataset,
  Locale,
  SkinTone,
} from "../types";
import { capitalize } from "../utils/capitalize";
import { isEmojiSupported } from "../utils/is-emoji-supported";
import { getStorage, setStorage } from "../utils/storage";
import * as $ from "../utils/validate";

const EMOJIBASE_EMOJIS_URL = (cdnUrl: string, locale: Locale) =>
  `${cdnUrl}/${locale}/data.json`;
const EMOJIBASE_MESSAGES_URL = (cdnUrl: string, locale: Locale) =>
  `${cdnUrl}/${locale}/messages.json`;

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

export const LOCAL_DATA_KEY = (locale: string) => `frimousse/data/${locale}`;
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

type LocalData = {
  data: EmojiData;
  metadata: {
    emojisEtag: string | null;
    messagesEtag: string | null;
  };
};

type SessionMetadata = {
  emojiVersion: number;
  countryFlags: boolean;
};

async function fetchEtag(url: string, signal?: AbortSignal) {
  try {
    const response = await fetch(url, { method: "HEAD", signal });

    return response.headers.get("etag");
  } catch (_) {
    return null;
  }
}

async function fetchEmojibaseData(
  cdnUrl: string,
  locale: Locale,
  signal?: AbortSignal,
) {
  const [{ emojis, emojisEtag }, { messages, messagesEtag }] =
    await Promise.all([
      fetch(EMOJIBASE_EMOJIS_URL(cdnUrl, locale), { signal }).then(
        async (response) => {
          return {
            emojis: (await response.json()) as EmojibaseEmoji[],
            emojisEtag: response.headers.get("etag"),
          };
        },
      ),
      fetch(EMOJIBASE_MESSAGES_URL(cdnUrl, locale), { signal }).then(
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
  cdnUrl: string,
  locale: Locale,
  signal?: AbortSignal,
) {
  const [emojisEtag, messagesEtag] = await Promise.all([
    fetchEtag(EMOJIBASE_EMOJIS_URL(cdnUrl, locale), signal),
    fetchEtag(EMOJIBASE_MESSAGES_URL(cdnUrl, locale), signal),
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
  cdnUrl: string,
  locale: Locale,
  signal?: AbortSignal,
): Promise<EmojiData> {
  const { emojis, emojisEtag, messages, messagesEtag } =
    await fetchEmojibaseData(cdnUrl, locale, signal);
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

  setStorage(localStorage, LOCAL_DATA_KEY(locale), {
    data: emojiData,
    metadata: {
      emojisEtag,
      messagesEtag,
    },
  });

  return emojiData;
}

function getSessionMetadata(
  emojis: EmojiDataEmoji[],
  emojiVersion?: number,
): SessionMetadata {
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
});

const validateLocalData = $.object<LocalData>({
  data: $.object({
    locale: $.string as $.Validator<Locale>,
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
  }),
  metadata: $.object({
    emojisEtag: $.nullable($.string),
    messagesEtag: $.nullable($.string),
  }),
});

export async function getEmojiData(
  locale: Locale,
  emojiVersion?: number,
  signal?: AbortSignal,
): Promise<EmojiData> {
  const cdnUrl = `https://cdn.jsdelivr.net/npm/emojibase-data@${typeof emojiVersion === "number" ? Math.floor(emojiVersion) : "latest"}`;
  let sessionMetadata = getStorage<SessionMetadata>(
    sessionStorage,
    SESSION_METADATA_KEY,
    validateSessionMetadata,
  );
  const localData = getStorage<LocalData>(
    localStorage,
    LOCAL_DATA_KEY(locale),
    validateLocalData,
  );

  let data: EmojiData;

  if (!localData) {
    // No local data
    data = await fetchEmojiData(cdnUrl, locale, signal);
  } else if (sessionMetadata) {
    // ETags are used to check if the data is up-to-date but only
    // once per session, so if the session metadata is already set,
    // the local data can be used
    data = localData.data;
  } else {
    // Check ETags to see if the local data is up-to-date,
    // but if that fails, the possibly-stale local data is used
    try {
      const { emojisEtag, messagesEtag } = await fetchEmojibaseEtags(
        cdnUrl,
        locale,
        signal,
      );

      data =
        !emojisEtag ||
        !messagesEtag ||
        emojisEtag !== localData.metadata.emojisEtag ||
        messagesEtag !== localData.metadata.messagesEtag
          ? await fetchEmojiData(cdnUrl, locale, signal)
          : localData.data;
    } catch {
      data = localData.data;
    }
  }

  // Set the session metadata if needed
  sessionMetadata ??= getSessionMetadata(data.emojis, emojiVersion);
  setStorage(sessionStorage, SESSION_METADATA_KEY, sessionMetadata);

  // Filter out unsupported emojis
  const filteredEmojis = data.emojis.filter((emoji) => {
    const isSupportedVersion = emoji.version <= sessionMetadata.emojiVersion;

    return emoji.countryFlag
      ? isSupportedVersion && sessionMetadata.countryFlags
      : isSupportedVersion;
  });

  return {
    locale,
    emojis: filteredEmojis,
    categories: data.categories,
    skinTones: data.skinTones,
  };
}

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
