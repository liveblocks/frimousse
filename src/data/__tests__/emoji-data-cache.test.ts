import { afterEach, describe, expect, it } from "vitest";
import type { EmojiData } from "../../types";
import { createEmojiDataCache } from "../emoji-data-cache";

const EMOJI_DATA: EmojiData = {
  // A non-Emojibase locale, to prove custom locales pass through untouched.
  locale: "tr",
  emojis: [
    {
      emoji: "😀",
      category: 0,
      label: "sırıtan yüz",
      version: 15,
      tags: ["yüz", "gülümseme"],
      countryFlag: undefined,
      skins: undefined,
    },
  ],
  categories: [{ index: 0, label: "Yüz ifadeleri" }],
  skinTones: {
    light: "🏻",
    "medium-light": "🏼",
    medium: "🏽",
    "medium-dark": "🏾",
    dark: "🏿",
  },
};

describe("createEmojiDataCache", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("should round-trip data and its metadata", () => {
    const cache = createEmojiDataCache<{ version: number }>();

    cache.set("tr", EMOJI_DATA, { version: 2 });

    expect(cache.get("tr")).toEqual({
      data: EMOJI_DATA,
      metadata: { version: 2 },
    });
  });

  it("should support entries without metadata", () => {
    const cache = createEmojiDataCache();

    cache.set("tr", EMOJI_DATA);

    expect(cache.get("tr")?.data).toEqual(EMOJI_DATA);
  });

  it("should return null for a missing locale", () => {
    const cache = createEmojiDataCache();

    expect(cache.get("tr")).toBeNull();
  });

  it("should return null for malformed data", () => {
    const cache = createEmojiDataCache();

    localStorage.setItem("frimousse/data/tr", "{}");
    expect(cache.get("tr")).toBeNull();

    localStorage.setItem(
      "frimousse/data/tr",
      JSON.stringify({ data: { locale: "tr" }, metadata: undefined }),
    );
    expect(cache.get("tr")).toBeNull();
  });

  it("should be namespaced by name", () => {
    const cache = createEmojiDataCache({ name: "my-app/emoji-data" });

    cache.set("tr", EMOJI_DATA);

    expect(localStorage.getItem("my-app/emoji-data/tr")).not.toBeNull();
    expect(createEmojiDataCache().get("tr")).toBeNull();
  });

  it("should delete a single entry", () => {
    const cache = createEmojiDataCache();

    cache.set("tr", EMOJI_DATA);
    cache.set("fa", EMOJI_DATA);
    cache.delete("tr");

    expect(cache.get("tr")).toBeNull();
    expect(cache.get("fa")).not.toBeNull();
  });

  it("should only clear its own entries", () => {
    const cache = createEmojiDataCache({ name: "my-app/emoji-data" });
    const otherCache = createEmojiDataCache();

    cache.set("tr", EMOJI_DATA);
    otherCache.set("tr", EMOJI_DATA);
    localStorage.setItem("unrelated", "value");

    cache.clear();

    expect(cache.get("tr")).toBeNull();
    expect(otherCache.get("tr")).not.toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("value");
  });
});
