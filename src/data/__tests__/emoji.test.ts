import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SESSION_METADATA_KEY } from "../emoji";
import { createEmojiDataCache } from "../emoji-data-cache";

const EMOJIBASE_URL = "https://cdn.jsdelivr.net/npm/emojibase-data@latest";
const cache = createEmojiDataCache({ name: `frimousse/data/${EMOJIBASE_URL}` });
let defaultEmojiDataResolver: typeof import("../emoji").defaultEmojiDataResolver;

async function reload() {
  vi.resetModules();
  ({ defaultEmojiDataResolver } = await import("../emoji"));
}

describe("defaultEmojiDataResolver", () => {
  beforeEach(reload);

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

  it("should fetch a new source and reuse each source's cached data", async () => {
    const original = await defaultEmojiDataResolver("en", {});
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const emojibaseUrl = "https://example.com/self-hosted-emojibase-data";

    await defaultEmojiDataResolver("en", { emojibaseUrl });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual([
      `${emojibaseUrl}/en/data.json`,
      `${emojibaseUrl}/en/messages.json`,
    ]);

    fetchSpy.mockClear();

    expect(await defaultEmojiDataResolver("en", {})).toEqual(original);
    await defaultEmojiDataResolver("en", { emojibaseUrl });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("should revalidate each source separately in a new session", async () => {
    const emojibaseUrl = "https://example.com/self-hosted-emojibase-data";
    await defaultEmojiDataResolver("en", {});
    await defaultEmojiDataResolver("en", { emojibaseUrl });

    sessionStorage.clear();

    await reload();
    await defaultEmojiDataResolver("en", {});
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await defaultEmojiDataResolver("en", { emojibaseUrl });

    expect(fetchSpy.mock.calls).toEqual([
      [
        `${emojibaseUrl}/en/data.json`,
        { method: "HEAD", signal: expect.any(AbortSignal) },
      ],
      [
        `${emojibaseUrl}/en/messages.json`,
        { method: "HEAD", signal: expect.any(AbortSignal) },
      ],
    ]);
  });

  it.each([
    [16, 5],
    [5, 16],
  ])("should switch from Emoji version %s to %s", async (from, to) => {
    await defaultEmojiDataResolver("en", { emojiVersion: from });
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const data = await defaultEmojiDataResolver("en", { emojiVersion: to });

    expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual([
      `https://cdn.jsdelivr.net/npm/emojibase-data@${to}/en/data.json`,
      `https://cdn.jsdelivr.net/npm/emojibase-data@${to}/en/messages.json`,
    ]);
    expect(data.emojis.length).toBeGreaterThan(0);
    expect(Math.max(...data.emojis.map((emoji) => emoji.version))).toBe(to);
  });

  it.each([undefined, 5])(
    "should apply version changes to cached data from a fixed source (initial version: %s)",
    async (emojiVersion) => {
      const emojibaseUrl = "https://example.com/self-hosted-emojibase-data";
      await defaultEmojiDataResolver("en", { emojibaseUrl, emojiVersion });
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      for (const version of [5, 12, 12.1, 16, undefined]) {
        const data = await defaultEmojiDataResolver("en", {
          emojibaseUrl,
          emojiVersion: version,
        });

        expect(data.emojis.length).toBeGreaterThan(0);
        expect(Math.max(...data.emojis.map((emoji) => emoji.version))).toBe(
          version ?? 16,
        );
      }

      expect(fetchSpy).not.toHaveBeenCalled();
    },
  );

  it("should fall back to the default locale when the locale isn't supported by Emojibase", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const data = await defaultEmojiDataResolver("unsupported", {});

    expect(data.locale).toBe("en");
    expect(warnSpy).toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it("should save data locally", async () => {
    await defaultEmojiDataResolver("en", {});

    const cached = cache.get("en");
    const sessionStorageData = sessionStorage.getItem(
      SESSION_METADATA_KEY(EMOJIBASE_URL),
    );

    expect(cached).not.toBeNull();
    expect(sessionStorageData).not.toBeNull();
  });

  it("should use local data if available from a previous session", async () => {
    await defaultEmojiDataResolver("en", {});

    sessionStorage.clear();

    await reload();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await defaultEmojiDataResolver("en", {});

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[0]).toEqual([
      "https://cdn.jsdelivr.net/npm/emojibase-data@latest/en/data.json",
      { method: "HEAD", signal: expect.any(AbortSignal) },
    ]);
    expect(fetchSpy.mock.calls[1]).toEqual([
      "https://cdn.jsdelivr.net/npm/emojibase-data@latest/en/messages.json",
      { method: "HEAD", signal: expect.any(AbortSignal) },
    ]);
  });

  it("should only revalidate a locale once per session", async () => {
    await defaultEmojiDataResolver("en", {});

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await defaultEmojiDataResolver("en", {});

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("should revalidate each locale separately", async () => {
    await defaultEmojiDataResolver("en", {});
    await defaultEmojiDataResolver("fr", {});

    sessionStorage.clear();

    await reload();
    await defaultEmojiDataResolver("en", {});

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await defaultEmojiDataResolver("fr", {});

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(fetchSpy.mock.calls[0]?.[1]).toMatchObject({ method: "HEAD" });
  });

  it("should not use broken local data", async () => {
    const localDataKey = `frimousse/data/${EMOJIBASE_URL}/en`;
    localStorage.setItem(localDataKey, "{}");
    sessionStorage.setItem(SESSION_METADATA_KEY(EMOJIBASE_URL), "{}");

    await defaultEmojiDataResolver("en", {});

    const localStorageData = localStorage.getItem(localDataKey);
    const sessionStorageData = sessionStorage.getItem(
      SESSION_METADATA_KEY(EMOJIBASE_URL),
    );

    expect(localStorageData).not.toBe("{}");
    expect(sessionStorageData).not.toBe("{}");
  });

  it.each([
    undefined,
    null,
  ])("should refresh cached data with %s metadata and repair its ETags", async (metadata) => {
    const original = await defaultEmojiDataResolver("en", {});
    localStorage.setItem(
      `frimousse/data/${EMOJIBASE_URL}/en`,
      JSON.stringify({ data: { ...original, emojis: [] }, metadata }),
    );
    sessionStorage.clear();

    await reload();
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const refreshed = await defaultEmojiDataResolver("en", {});

    expect(refreshed.emojis).toHaveLength(original.emojis.length);
    expect(
      fetchSpy.mock.calls
        .filter(([, options]) => options?.method !== "HEAD")
        .map(([url]) => url),
    ).toEqual([
      `${EMOJIBASE_URL}/en/data.json`,
      `${EMOJIBASE_URL}/en/messages.json`,
    ]);
    expect(cache.get("en")?.metadata).toEqual({
      emojisEtag: expect.any(String),
      messagesEtag: expect.any(String),
    });

    sessionStorage.clear();
    await reload();
    fetchSpy.mockClear();

    const cached = await defaultEmojiDataResolver("en", {});

    expect(cached.emojis).toHaveLength(original.emojis.length);
    expect(fetchSpy.mock.calls.map(([, options]) => options?.method)).toEqual([
      "HEAD",
      "HEAD",
    ]);
  });
});
