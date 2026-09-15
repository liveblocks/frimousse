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

beforeEach(async () => {
  vi.resetModules();
  ({ getEmojiDetails } = await import("../get-emoji-details"));
  ({ defaultEmojiDataResolver } = await import("../emoji"));
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("getEmojiDetails", () => {
  it("should share a cold load across concurrent lookups and a picker", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const lookups = Array.from({ length: 100 }, () => getEmojiDetails("❤️"));
    const [emoji, data] = await Promise.all([
      Promise.all(lookups),
      defaultEmojiDataResolver("en", {}),
    ]);

    expectTypeOf(emoji[0]).toEqualTypeOf<EmojiDetails | undefined>();
    expectTypeOf<EmojiDetails>().toEqualTypeOf<EmojiData["emojis"][number]>();
    expect(emoji.every((entry) => entry?.label === "Red heart")).toBe(true);
    expect(data.emojis.length).toBeGreaterThan(0);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("should reuse picker data without fetching or reading storage", async () => {
    await defaultEmojiDataResolver("en", {});
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const storageSpy = vi.spyOn(Storage.prototype, "getItem");

    const first = await getEmojiDetails("❤️");
    const second = await getEmojiDetails("❤");

    expect(first).toMatchObject({
      label: "Red heart",
      tags: expect.any(Array),
    });
    expect(second).toBe(first);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });

  it.each([
    "👍",
    "👍️",
    "👍🏽",
  ])("should match %s to its base entry", async (emoji) => {
    expect(await getEmojiDetails(emoji)).toMatchObject({ label: "Thumbs up" });
  });

  it("should match skin tones in joined sequences", async () => {
    expect(await getEmojiDetails("👩🏽‍💻")).toMatchObject({
      label: "Woman technologist",
    });
  });

  it.each([
    ["🫱🏽‍🫲🏻", "🤝"],
    ["👩🏽‍❤️‍👨🏻", "👩‍❤️‍👨"],
    ["👩🏽‍❤️‍💋‍👨🏻", "👩‍❤️‍💋‍👨"],
    ["🧑🏽‍🤝‍🧑🏻", "🧑‍🤝‍🧑"],
  ])("should match mixed skin tones in %s to %s", async (emoji, base) => {
    const details = await getEmojiDetails(base);

    expect(details).toBeDefined();
    expect(await getEmojiDetails(emoji)).toBe(details);
  });

  it("should look up mixed skin tones from persisted picker data", async () => {
    await defaultEmojiDataResolver("en", {});
    vi.resetModules();
    ({ getEmojiDetails } = await import("../get-emoji-details"));
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    expect(await getEmojiDetails("🫱🏽‍🫲🏻")).toMatchObject({
      emoji: "🤝",
      label: "Handshake",
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("should keep locales and data sources separate", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const [english, french, otherSource] = await Promise.all([
      getEmojiDetails("❤️"),
      getEmojiDetails("❤️", { locale: "fr" }),
      getEmojiDetails("❤️", { emojibaseUrl: "https://example.com/emojis" }),
    ]);

    expect(english?.label).toBe("Red heart");
    expect(french?.label).toBe("Cœur rouge");
    expect(otherSource).toEqual(english);
    expect(otherSource).not.toBe(english);
    expect(fetchSpy).toHaveBeenCalledTimes(6);
    expect(await getEmojiDetails("❤️")).toBe(english);
    expect(fetchSpy).toHaveBeenCalledTimes(6);
  });

  it("should look up emojis hidden by the picker's version and flag filtering", async () => {
    const data = await defaultEmojiDataResolver("en", {
      emojiVersion: 5,
      emojibaseUrl: "https://cdn.jsdelivr.net/npm/emojibase-data@latest",
    });

    expect(data.emojis.some((emoji) => emoji.emoji === "🇳🇵")).toBe(false);
    expect(data.emojis.every((emoji) => emoji.version <= 5)).toBe(true);
    expect(await getEmojiDetails("🇳🇵")).toMatchObject({ label: "Flag: Nepal" });
    expect(await getEmojiDetails("🫩")).toMatchObject({ version: 16 });
  });

  it("should not check browser support for a lookup", async () => {
    const createElementSpy = vi.spyOn(document, "createElement");

    expect(await getEmojiDetails("🇳🇵")).toBeDefined();
    expect(createElementSpy).not.toHaveBeenCalled();
  });

  it("should return undefined for an unknown emoji", async () => {
    expect(await getEmojiDetails("not an emoji")).toBeUndefined();
  });

  it("should cancel one caller without aborting a shared load", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const controller = new AbortController();
    const cancelled = getEmojiDetails("❤️", { signal: controller.signal });
    const remaining = defaultEmojiDataResolver("en", {});

    controller.abort();

    await expect(cancelled).rejects.toThrow(DOMException);
    expect((await remaining).emojis.length).toBeGreaterThan(0);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);
  });

  it("should abort the fetch when its last caller cancels, then allow a retry", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const controller = new AbortController();
    const cancelled = getEmojiDetails("❤️", { signal: controller.signal });

    controller.abort();
    await expect(cancelled).rejects.toThrow(DOMException);

    expect(fetchSpy.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    expect(await getEmojiDetails("❤️")).toMatchObject({ label: "Red heart" });
    expect(fetchSpy).toHaveBeenCalledTimes(4);
    await getEmojiDetails("❤️");
    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });

  it("should not fetch for an already aborted caller", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const controller = new AbortController();
    controller.abort();

    await expect(
      getEmojiDetails("❤️", { signal: controller.signal }),
    ).rejects.toThrow(DOMException);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("should retry a failed load", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("Offline"));

    await expect(getEmojiDetails("❤️")).rejects.toThrow("Offline");
    expect(await getEmojiDetails("❤️")).toMatchObject({ label: "Red heart" });
    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });

  it("should still reuse data when browser storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Unavailable");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Unavailable");
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    expect(await getEmojiDetails("❤️")).toMatchObject({ label: "Red heart" });
    expect(await getEmojiDetails("👍")).toMatchObject({ label: "Thumbs up" });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("should reuse the index for a custom dataset and accept replacement data", async () => {
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
    const controller = new AbortController();
    const options = {
      locale: "ne",
      resolveEmojiData,
      signal: controller.signal,
    };

    expect(await getEmojiDetails("😀", options)).toBe(data.emojis[0]);
    expect(await getEmojiDetails("😀", options)).toBe(data.emojis[0]);
    expect(iteratorSpy).toHaveBeenCalledTimes(1);
    expect(resolveEmojiData).toHaveBeenCalledWith("ne", {
      emojibaseUrl: undefined,
      signal: controller.signal,
    });

    resolveEmojiData.mockReturnValue({ ...data, emojis: [] });
    expect(await getEmojiDetails("😀", options)).toBeUndefined();
  });
});
