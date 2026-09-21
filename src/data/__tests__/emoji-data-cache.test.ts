import { afterEach, describe, expect, it } from "vitest";
import type { EmojiData } from "../../types";
import { createEmojiDataCache } from "../emoji-data-cache";

const EMOJI_DATA: EmojiData = {
  locale: "ne",
  emojis: [
    {
      emoji: "😀",
      category: 0,
      label: "हाँसेको अनुहार",
      version: 15,
      tags: ["अनुहार", "हाँसो"],
    },
  ],
  categories: [{ index: 0, label: "अनुहारहरू" }],
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

    cache.set("ne", EMOJI_DATA, { version: 2 });

    expect(cache.get("ne")).toEqual({
      data: EMOJI_DATA,
      metadata: { version: 2 },
    });
  });

  it("should support entries without metadata", () => {
    const cache = createEmojiDataCache();

    cache.set("ne", EMOJI_DATA);

    expect(cache.get("ne")?.data).toEqual(EMOJI_DATA);
  });

  it("should return null for a missing locale", () => {
    const cache = createEmojiDataCache();

    expect(cache.get("ne")).toBeNull();
  });

  it("should return null for malformed data", () => {
    const cache = createEmojiDataCache();

    localStorage.setItem("frimousse/data/ne", "{}");
    expect(cache.get("ne")).toBeNull();

    localStorage.setItem(
      "frimousse/data/ne",
      JSON.stringify({ data: { locale: "ne" }, metadata: undefined }),
    );
    expect(cache.get("ne")).toBeNull();
  });

  it("should be namespaced by name", () => {
    const cache = createEmojiDataCache({ name: "my-app/emoji-data" });

    cache.set("ne", EMOJI_DATA);

    expect(localStorage.getItem("my-app/emoji-data/ne")).not.toBeNull();
    expect(createEmojiDataCache().get("ne")).toBeNull();
  });

  it("should delete a single entry", () => {
    const cache = createEmojiDataCache();

    cache.set("ne", EMOJI_DATA);
    cache.set("fa", EMOJI_DATA);
    cache.delete("ne");

    expect(cache.get("ne")).toBeNull();
    expect(cache.get("fa")).not.toBeNull();
  });

  it("should only clear its own entries", () => {
    const cache = createEmojiDataCache({ name: "my-app/emoji-data" });
    const otherCache = createEmojiDataCache();

    cache.set("ne", EMOJI_DATA);
    otherCache.set("ne", EMOJI_DATA);
    localStorage.setItem("unrelated", "value");

    cache.clear();

    expect(cache.get("ne")).toBeNull();
    expect(otherCache.get("ne")).not.toBeNull();
    expect(localStorage.getItem("unrelated")).toBe("value");
  });
});
