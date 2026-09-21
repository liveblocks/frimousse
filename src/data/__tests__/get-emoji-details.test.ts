import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from "vitest";
import type { EmojiDetails } from "../../index";
import type { EmojiData } from "../../types";

let getEmojiDetails: typeof import("../get-emoji-details").getEmojiDetails;
let defaultEmojiDataResolver: typeof import("../emoji").defaultEmojiDataResolver;
let resolveCustomEmojiData: typeof import("../emoji-data-store").resolveCustomEmojiData;

beforeEach(async () => {
  vi.resetModules();
  ({ getEmojiDetails } = await import("../get-emoji-details"));
  ({ defaultEmojiDataResolver } = await import("../emoji"));
  ({ resolveCustomEmojiData } = await import("../emoji-data-store"));
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("getEmojiDetails", () => {
  it("should return undefined synchronously without loading missing data", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const storageSpy = vi.spyOn(Storage.prototype, "getItem");
    const details = getEmojiDetails("❤️");

    expectTypeOf(details).toEqualTypeOf<EmojiDetails | undefined>();
    expectTypeOf<EmojiDetails>().toEqualTypeOf<EmojiData["emojis"][number]>();
    expect(details).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });

  it("should return undefined during a load, then read the completed data", async () => {
    const pending = defaultEmojiDataResolver("en", {});

    expect(getEmojiDetails("❤️")).toBeUndefined();
    await pending;
    expect(getEmojiDetails("❤️")).toMatchObject({ label: "Red heart" });
  });

  it("should reuse picker data without fetching or reading storage", async () => {
    await defaultEmojiDataResolver("en", {});
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const storageSpy = vi.spyOn(Storage.prototype, "getItem");
    const first = getEmojiDetails("❤️");

    expect(first).toMatchObject({
      label: "Red heart",
      tags: expect.any(Array),
    });
    expect(getEmojiDetails("❤")).toBe(first);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });

  it.each([
    "👍",
    "👍️",
    "👍🏽",
  ])("should match %s to its base entry", async (emoji) => {
    await defaultEmojiDataResolver("en", {});
    expect(getEmojiDetails(emoji)).toMatchObject({ label: "Thumbs up" });
  });

  it("should match skin tones in joined sequences", async () => {
    await defaultEmojiDataResolver("en", {});
    expect(getEmojiDetails("👩🏽‍💻")).toMatchObject({
      label: "Woman technologist",
    });
  });

  it.each([
    ["🫱🏽‍🫲🏻", "🤝"],
    ["👩🏽‍❤️‍👨🏻", "👩‍❤️‍👨"],
    ["👩🏽‍❤️‍💋‍👨🏻", "👩‍❤️‍💋‍👨"],
    ["🧑🏽‍🤝‍🧑🏻", "🧑‍🤝‍🧑"],
  ])("should match mixed skin tones in %s to %s", async (emoji, base) => {
    await defaultEmojiDataResolver("en", {});
    const details = getEmojiDetails(base);

    expect(details).toBeDefined();
    expect(getEmojiDetails(emoji)).toBe(details);
  });

  it("should leave persisted data loading to the picker or hook", async () => {
    await defaultEmojiDataResolver("en", {});
    vi.resetModules();
    ({ getEmojiDetails } = await import("../get-emoji-details"));
    ({ defaultEmojiDataResolver } = await import("../emoji"));
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const storageSpy = vi.spyOn(Storage.prototype, "getItem");

    expect(getEmojiDetails("🫱🏽‍🫲🏻")).toBeUndefined();
    expect(storageSpy).not.toHaveBeenCalled();
    await defaultEmojiDataResolver("en", {});
    expect(getEmojiDetails("🫱🏽‍🫲🏻")).toMatchObject({
      emoji: "🤝",
      label: "Handshake",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("should keep locales and data sources separate", async () => {
    await defaultEmojiDataResolver("en", {});
    expect(getEmojiDetails("❤️", { locale: "fr" })).toBeUndefined();
    const emojibaseUrl = "https://example.com/emojis";
    expect(getEmojiDetails("❤️", { emojibaseUrl })).toBeUndefined();
    await Promise.all([
      defaultEmojiDataResolver("fr", {}),
      defaultEmojiDataResolver("en", { emojibaseUrl }),
    ]);

    const english = getEmojiDetails("❤️");
    const french = getEmojiDetails("❤️", { locale: "fr" });
    const otherSource = getEmojiDetails("❤️", { emojibaseUrl });

    expect(english?.label).toBe("Red heart");
    expect(french?.label).toBe("Cœur rouge");
    expect(otherSource).toEqual(english);
    expect(otherSource).not.toBe(english);
  });

  it("should share the source selected by a picker's Emoji version", async () => {
    await defaultEmojiDataResolver("en", { emojiVersion: 5 });

    expect(getEmojiDetails("❤️", { emojiVersion: 5 })).toBeDefined();
    expect(getEmojiDetails("❤️")).toBeUndefined();
  });

  it("should include emojis hidden by picker filtering, even with an explicit default resolver", async () => {
    const data = await defaultEmojiDataResolver("en", {
      emojiVersion: 5,
      emojibaseUrl: "https://cdn.jsdelivr.net/npm/emojibase-data@latest",
    });
    const createElementSpy = vi.spyOn(document, "createElement");

    expect(data.emojis.some((emoji) => emoji.emoji === "🇳🇵")).toBe(false);
    expect(data.emojis.every((emoji) => emoji.version <= 5)).toBe(true);
    expect(getEmojiDetails("🇳🇵")).toMatchObject({ label: "Flag: Nepal" });
    expect(
      getEmojiDetails("🫩", { resolveEmojiData: defaultEmojiDataResolver }),
    ).toMatchObject({ version: 16 });
    expect(createElementSpy).not.toHaveBeenCalled();
  });

  it("should return undefined for an unknown emoji", async () => {
    await defaultEmojiDataResolver("en", {});
    expect(getEmojiDetails("not an emoji")).toBeUndefined();
  });

  it("should reuse custom data without calling the resolver and accept replacement data", async () => {
    const data: EmojiData = {
      locale: "ne",
      emojis: [
        {
          emoji: "😀",
          label: "हाँसेको अनुहार",
          tags: ["खुसी"],
          category: 0,
          version: 1,
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
    const iteratorSpy = vi.spyOn(data.emojis, Symbol.iterator);
    const resolveEmojiData = vi.fn(() => data);
    const options = { locale: "ne", resolveEmojiData };

    expect(getEmojiDetails("😀", options)).toBeUndefined();
    expect(resolveEmojiData).not.toHaveBeenCalled();
    await resolveCustomEmojiData(resolveEmojiData, "ne", {});
    expect(getEmojiDetails("😀", options)).toBe(data.emojis[0]);
    expect(getEmojiDetails("😀", options)).toBe(data.emojis[0]);
    expect(iteratorSpy).toHaveBeenCalledTimes(1);
    expect(resolveEmojiData).toHaveBeenCalledTimes(1);

    resolveEmojiData.mockReturnValue({ ...data, emojis: [] });
    await resolveCustomEmojiData(resolveEmojiData, "ne", {});
    expect(getEmojiDetails("😀", options)).toBeUndefined();
  });
});
