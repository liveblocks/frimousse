import { afterEach, beforeEach, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";

const EMOJIBASE_URL_REGEX = /\/(\w+)\/(\w+\.json)$/;

const fetchMocker = createFetchMock(vi);
fetchMocker.enableMocks();

function hash(value: string) {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return hash.toString(16);
}

beforeEach(() => {
  fetchMocker.mockIf(EMOJIBASE_URL_REGEX, async (req) => {
    const [, locale, file] = req.url.match(EMOJIBASE_URL_REGEX) ?? [];

    if (locale === "en" && file === "data.json") {
      const headers: HeadersInit = {
        ETag: hash("en/data.json"),
      };

      if (req.method === "GET") {
        const data = (await import("emojibase-data/en/data.json")).default;
        return {
          body: JSON.stringify(data),
          headers,
        };
      }

      if (req.method === "HEAD") {
        return {
          status: 200,
          headers,
        };
      }
    }

    if (locale === "en" && file === "messages.json") {
      const headers: HeadersInit = {
        ETag: hash("en/messages.json"),
      };

      if (req.method === "GET") {
        const messages = (await import("emojibase-data/en/messages.json"))
          .default;
        return {
          body: JSON.stringify(messages),
          headers,
        };
      }

      if (req.method === "HEAD") {
        return {
          status: 200,
          headers,
        };
      }
    }

    if (locale === "fr" && file === "data.json") {
      const headers: HeadersInit = {
        ETag: hash("fr/data.json"),
      };

      if (req.method === "GET") {
        const data = (await import("emojibase-data/fr/data.json")).default;
        return {
          body: JSON.stringify(data),
          headers,
        };
      }

      if (req.method === "HEAD") {
        return {
          status: 200,
          headers,
        };
      }
    }

    if (locale === "fr" && file === "messages.json") {
      const headers: HeadersInit = {
        ETag: hash("fr/messages.json"),
      };

      if (req.method === "GET") {
        const messages = (await import("emojibase-data/fr/messages.json"))
          .default;
        return {
          body: JSON.stringify(messages),
          headers,
        };
      }

      if (req.method === "HEAD") {
        return {
          status: 200,
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
