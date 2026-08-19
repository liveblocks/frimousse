import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultEmojiDataResolver, SESSION_METADATA_KEY } from "../emoji";
import { createEmojiDataCache } from "../emoji-data-cache";

const cache = createEmojiDataCache();

describe("defaultEmojiDataResolver", () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("should return the emoji data", async () => {
    const data = await defaultEmojiDataResolver("en", {});

    expect(data).toBeDefined();
  });

  it("should support aborting the request", async () => {
    const controller = new AbortController();
    const promise = defaultEmojiDataResolver("en", {
      signal: controller.signal,
    });

    controller.abort();

    await expect(promise).rejects.toThrow(DOMException);
  });

  it("should support a specific Emoji version", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const data = await defaultEmojiDataResolver("en", { emojiVersion: 5 });

    expect(data).toBeDefined();
    expect(data.emojis.every((emoji) => emoji.version <= 5)).toBe(true);

    expect(fetchSpy.mock.calls[0]?.[0]).toEqual(
      "https://cdn.jsdelivr.net/npm/emojibase-data@5/en/data.json",
    );
    expect(fetchSpy.mock.calls[1]?.[0]).toEqual(
      "https://cdn.jsdelivr.net/npm/emojibase-data@5/en/messages.json",
    );
  });

  it("should support a custom Emojibase URL", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const data = await defaultEmojiDataResolver("en", {
      emojibaseUrl: "https://example.com/self-hosted-emojibase-data",
    });

    expect(data).toBeDefined();

    expect(fetchSpy.mock.calls[0]?.[0]).toEqual(
      "https://example.com/self-hosted-emojibase-data/en/data.json",
    );
    expect(fetchSpy.mock.calls[1]?.[0]).toEqual(
      "https://example.com/self-hosted-emojibase-data/en/messages.json",
    );
  });

  it("should fall back to the default locale when the locale isn't supported by Emojibase", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const data = await defaultEmojiDataResolver("tr", {});

    expect(data.locale).toBe("en");
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("should save data locally", async () => {
    await defaultEmojiDataResolver("en", {});

    const cached = cache.get("en");
    const sessionStorageData = sessionStorage.getItem(SESSION_METADATA_KEY);

    expect(cached).not.toBeNull();
    expect(sessionStorageData).not.toBeNull();
  });

  it("should use local data if available from a previous session", async () => {
    await defaultEmojiDataResolver("en", {});

    sessionStorage.clear();

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await defaultEmojiDataResolver("en", {});

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[0]).toEqual([
      "https://cdn.jsdelivr.net/npm/emojibase-data@latest/en/data.json",
      { method: "HEAD" },
    ]);
    expect(fetchSpy.mock.calls[1]).toEqual([
      "https://cdn.jsdelivr.net/npm/emojibase-data@latest/en/messages.json",
      { method: "HEAD" },
    ]);
  });

  it("should only revalidate a locale once per session", async () => {
    await defaultEmojiDataResolver("en", {});

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await defaultEmojiDataResolver("en", {});

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("should revalidate each locale separately", async () => {
    // Cache both locales, then start from a fresh session.
    await defaultEmojiDataResolver("en", {});
    await defaultEmojiDataResolver("fr", {});

    sessionStorage.clear();

    await defaultEmojiDataResolver("en", {});

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    // Revalidating "en" shouldn't mark "fr" as revalidated too.
    await defaultEmojiDataResolver("fr", {});

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[0]?.[1]).toMatchObject({ method: "HEAD" });
  });

  it("should not use broken local data", async () => {
    localStorage.setItem("frimousse/data/en", "{}");
    sessionStorage.setItem(SESSION_METADATA_KEY, "{}");

    await defaultEmojiDataResolver("en", {});

    const localStorageData = localStorage.getItem("frimousse/data/en");
    const sessionStorageData = sessionStorage.getItem(SESSION_METADATA_KEY);

    expect(localStorageData).not.toBe("{}");
    expect(sessionStorageData).not.toBe("{}");
  });
});
