import { afterEach, beforeEach, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";

const CDN_URL_REGEX =
  /^https?:\/\/cdn\.jsdelivr\.net\/npm\/emojibase-data@(?:latest|[\d\.]+)\/(\w+)\/(\w+\.json)$/;

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

beforeEach(() => {
  fetchMocker.mockIf(CDN_URL_REGEX, async (req) => {
    const [, locale, file] = req.url.match(CDN_URL_REGEX) ?? [];

    const headers: HeadersInit = {
      // TODO: generate randomly?
      ETag: "abc123",
    };

    if (req.method === "HEAD") {
      return {
        status: 200,
        headers,
      };
    }

    if (req.method === "GET") {
      if (locale === "en" && file === "data.json") {
        const data = (await import("emojibase-data/en/data.json")).default;
        return {
          body: JSON.stringify(data),
          headers,
        };
      }

      if (locale === "en" && file === "messages.json") {
        const data = (await import("emojibase-data/en/messages.json")).default;
        return {
          body: JSON.stringify(data),
          headers,
        };
      }

      if (locale === "fr" && file === "data.json") {
        const data = (await import("emojibase-data/fr/data.json")).default;
        return {
          body: JSON.stringify(data),
          headers,
        };
      }

      if (locale === "fr" && file === "messages.json") {
        const data = (await import("emojibase-data/fr/messages.json")).default;
        return {
          body: JSON.stringify(data),
          headers,
        };
      }
    }

    throw new Error(`Unhandled URL: ${req.url}`);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
