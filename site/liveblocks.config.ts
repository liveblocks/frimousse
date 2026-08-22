import type { LiveMap } from "@liveblocks/client";

export type Reactions = LiveMap<string, LiveMap<string, number>>;

export type ReactionsJson = Record<string, Record<string, number>>;

export type ReactionsJsonEntries = [string, Record<string, number>][];

declare global {
  interface Liveblocks {
    Storage: {
      reactions: Reactions;
    };
    StorageJson: {
      reactions: ReactionsJson;
    };
  }
}

export const ROOM_ID = "frimousse";

export const CREATED_AT_KEY = "@createdAt";
export const UPDATED_AT_KEY = "@updatedAt";
export const DEFAULT_KEYS = [CREATED_AT_KEY, UPDATED_AT_KEY];
export const DEFAULT_KEYS_COUNT = DEFAULT_KEYS.length;

// Roughly 3 rows of reactions on largest breakpoint
export const MAX_REACTIONS = 30;

// `null` in engines without support for the `v` flag, in which case
// reactions aren't filtered
const RGI_EMOJI = (() => {
  try {
    return new RegExp("^\\p{RGI_Emoji}$", "v");
  } catch {
    return null;
  }
})();

const LETTERS = /\p{L}/u;

// Clients have write access to the room so reaction keys can't be trusted
// to be emojis: anything that isn't exactly one RGI emoji is hidden.
export function isEmojiReaction(emoji: string): boolean {
  return RGI_EMOJI ? RGI_EMOJI.test(emoji) : true;
}

// Deletion is more conservative than hiding: an emoji too recent for this
// engine's Unicode data fails the RGI test but contains no letters, so it
// is hidden here without being deleted for everyone else.
export function isJunkReaction(emoji: string): boolean {
  return !isEmojiReaction(emoji) && LETTERS.test(emoji);
}

// Timestamps can't be trusted either, anything that isn't a number sorts as 0
function getTimestamp(value: unknown): number {
  return typeof value === "number" ? value : 0;
}

export function sortReactions(
  [, dataA]: [string, LiveMap<string, number> | ReadonlyMap<string, number>],
  [, dataB]: [string, LiveMap<string, number> | ReadonlyMap<string, number>],
) {
  return (
    getTimestamp(dataB.get(CREATED_AT_KEY)) -
    getTimestamp(dataA.get(CREATED_AT_KEY))
  );
}

export function sortReactionsEntries(
  [, dataA]: ReactionsJsonEntries[number],
  [, dataB]: ReactionsJsonEntries[number],
) {
  return (
    getTimestamp(dataB[CREATED_AT_KEY]) - getTimestamp(dataA[CREATED_AT_KEY])
  );
}

// A reaction is visible iff its key is an emoji and it has at least one vote.
// Returns visible reactions filtered, sorted, and counted, ready to render.
export function getVisibleReactions(
  reactions: ReadonlyMap<string, ReadonlyMap<string, number>>,
): [emoji: string, count: number, data: ReadonlyMap<string, number>][] {
  return Array.from(reactions)
    .filter(([emoji]) => isEmojiReaction(emoji))
    .sort(sortReactions)
    .map(
      ([emoji, data]): [string, number, ReadonlyMap<string, number>] => [
        emoji,
        data.size - DEFAULT_KEYS_COUNT,
        data,
      ],
    )
    .filter(([, count]) => count > 0);
}

export function getVisibleReactionsEntries(
  reactions: ReactionsJson,
): [emoji: string, count: number, data: Record<string, number>][] {
  return Object.entries(reactions)
    .filter(([emoji]) => isEmojiReaction(emoji))
    .sort(sortReactionsEntries)
    .map(
      ([emoji, data]): [string, number, Record<string, number>] => [
        emoji,
        Object.keys(data).length - DEFAULT_KEYS_COUNT,
        data,
      ],
    )
    .filter(([, count]) => count > 0);
}

function createDefaultReactions(emojis: string[]) {
  const reactions: ReactionsJson = {};

  for (const [index, emoji] of Object.entries(
    emojis.slice(0, MAX_REACTIONS).reverse(),
  )) {
    if (Number(index) > MAX_REACTIONS) {
      break;
    }

    reactions[emoji] = {
      [CREATED_AT_KEY]: Number(index),
      [UPDATED_AT_KEY]: Number(index),
    };

    // Initialize reactions pseudo-randomly between 1 and 15
    const seed = (Number(index) * 9301 + 49297) % 233280;
    const count = (seed % 15) + 1;

    for (let i = 0; i < count; i++) {
      reactions[emoji][`#${i}`] = 1;
    }
  }

  return reactions;
}

export const DEFAULT_REACTIONS = createDefaultReactions([
  "😊",
  "👋",
  "🎨",
  "💬",
  "🌱",
  "🫶",
  "🌈",
  "🔥",
  "🫰",
  "🌚",
  "👋",
  "🏳️‍🌈",
  "✨",
  "📚",
  "🎵",
  "👸",
  "🤓",
  "🔮",
  "🗿",
  "🏳️‍⚧️",
  "😶",
  "🥖",
  "🦋",
  "🌸",
  "🎹",
  "🎉",
  "🤔",
  "🧩",
  "🐈‍⬛",
  "🧶",
  "🪀",
  "🥸",
  "🪁",
  "🤌",
  "🪐",
  "🌹",
  "🎼",
  "🤹",
  "👀",
  "🍂",
  "🍬",
  "🍭",
  "🎀",
  "🎈",
  "🤩",
  "👒",
  "🏝️",
  "🌊",
  "😵‍💫",
  "🥁",
  "🎶",
]);
