import { afterEach, beforeEach, vi } from "vitest";

const EMOJIBASE_URL_REGEX = /\/(\w+)\/(\w+\.json)$/;

const DATASETS: Record<string, () => Promise<{ default: unknown }>> = {
  "en/data.json": () => import("emojibase-data/en/data.json"),
  "en/messages.json": () => import("emojibase-data/en/messages.json"),
  "fr/data.json": () => import("emojibase-data/fr/data.json"),
  "fr/messages.json": () => import("emojibase-data/fr/messages.json"),
};

function hash(value: string) {
  let hash = 0;

  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }

  return hash.toString(16);
}

/**
 * Rejects as soon as `signal` is aborted, otherwise resolves with `promise`.
 * `fetch` is mocked so it wouldn't handle abort signals on its own.
 */
function abortable<T>(promise: Promise<T>, signal?: AbortSignal | null) {
  if (!signal) {
    return promise;
  }

  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      if (signal.aborted) {
        reject(signal.reason);
      } else {
        signal.addEventListener("abort", () => reject(signal.reason), {
          once: true,
        });
      }
    }),
  ]);
}

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";

      return await abortable(
        (async () => {
          const [, locale, file] = url.match(EMOJIBASE_URL_REGEX) ?? [];
          const dataset = DATASETS[`${locale}/${file}`];

          if (!dataset) {
            throw new Error(`Unhandled URL: ${url}`);
          }

          const headers = new Headers({ ETag: hash(`${locale}/${file}`) });

          if (method === "HEAD") {
            return new Response(null, { status: 200, headers });
          }

          const data = (await dataset()).default;

          return new Response(JSON.stringify(data), { status: 200, headers });
        })(),
        init?.signal,
      );
    }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
