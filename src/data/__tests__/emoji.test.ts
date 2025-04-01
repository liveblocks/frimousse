import { afterEach, describe, expect, it, vi } from "vitest";
import { LOCAL_DATA_KEY, SESSION_METADATA_KEY, getEmojiData } from "../emoji";

describe("getEmojiData", () => {
  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it("should return the emoji data", async () => {
    const data = await getEmojiData({ locale: "en" });

    expect(data).toBeDefined();
  });

  it("should support aborting the request", async () => {
    const controller = new AbortController();
    const promise = getEmojiData({ locale: "en", signal: controller.signal });

    controller.abort();

    await expect(promise).rejects.toThrow(DOMException);
  });

  it("should support a specific emoji version", async () => {
    const data = await getEmojiData({ locale: "en", emojiVersion: 5 });

    expect(data).toBeDefined();
    expect(data.emojis.every((emoji) => emoji.version <= 5)).toBe(true);
  });

  it("should save data locally", async () => {
    await getEmojiData({ locale: "en" });

    const localStorageData = localStorage.getItem(LOCAL_DATA_KEY("en"));
    const sessionStorageData = sessionStorage.getItem(SESSION_METADATA_KEY);

    expect(localStorageData).not.toBeNull();
    expect(sessionStorageData).not.toBeNull();
  });

  it("should use local data if available from a previous session", async () => {
    await getEmojiData({ locale: "en" });

    sessionStorage.clear();

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    await getEmojiData({ locale: "en" });

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

  it("should not use broken local data", async () => {
    localStorage.setItem(LOCAL_DATA_KEY("en"), "{}");
    sessionStorage.setItem(SESSION_METADATA_KEY, "{}");

    await getEmojiData({ locale: "en" });

    const localStorageData = localStorage.getItem(LOCAL_DATA_KEY("en"));
    const sessionStorageData = sessionStorage.getItem(SESSION_METADATA_KEY);

    expect(localStorageData).not.toBe("{}");
    expect(sessionStorageData).not.toBe("{}");
  });
});
