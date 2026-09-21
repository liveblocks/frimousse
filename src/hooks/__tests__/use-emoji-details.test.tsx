import { act, render, renderHook, waitFor } from "@testing-library/react";
import {
  Component,
  createRef,
  type PropsWithChildren,
  StrictMode,
  Suspense,
} from "react";
import { renderToString } from "react-dom/server";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from "vitest";
import type { EmojiData, EmojiDataResolver, EmojiDetails } from "../../types";
import type { UseEmojiDetailsOptions } from "../use-emoji-details";

let useEmojiDetails: typeof import("../use-emoji-details").useEmojiDetails;
let getEmojiDetails: typeof import("../../data/get-emoji-details").getEmojiDetails;
let defaultEmojiDataResolver: typeof import("../../data/emoji").defaultEmojiDataResolver;
let EmojiPicker: typeof import("../../components/emoji-picker");

const customData: EmojiData = {
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

function Label({
  emoji = "❤️",
  options,
}: {
  emoji?: string;
  options?: UseEmojiDetailsOptions;
}) {
  const details = useEmojiDetails(emoji, options);
  expectTypeOf(details).toEqualTypeOf<EmojiDetails | undefined>();
  return <span>{details?.label ?? "Unknown emoji"}</span>;
}

function Lookup(props: { emoji?: string; options?: UseEmojiDetailsOptions }) {
  return (
    <Suspense fallback={<span>Loading</span>}>
      <Label {...props} />
    </Suspense>
  );
}

class ErrorBoundary extends Component<
  PropsWithChildren,
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    return this.state.error ? (
      <span role="alert">{this.state.error.message}</span>
    ) : (
      this.props.children
    );
  }
}

function pendingData() {
  let resolve: (data: EmojiData) => void = () => {
    throw new Error("Promise has not been created");
  };
  const promise = new Promise<EmojiData>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

beforeEach(async () => {
  vi.resetModules();
  ({ useEmojiDetails } = await import("../use-emoji-details"));
  ({ getEmojiDetails } = await import("../../data/get-emoji-details"));
  ({ defaultEmojiDataResolver } = await import("../../data/emoji"));
  EmojiPicker = await import("../../components/emoji-picker");
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("useEmojiDetails", () => {
  it("should suspend without a picker, then return details and populate the synchronous lookup", async () => {
    const view = render(<Lookup emoji="👍🏽" />);

    expect(view.getByText("Loading")).toBeVisible();
    expect(getEmojiDetails("👍🏽")).toBeUndefined();
    expect(await view.findByText("Thumbs up")).toBeVisible();
    expect(view.queryByText("Loading")).toBeNull();
    expect(getEmojiDetails("👍🏽")).toBe(getEmojiDetails("👍"));
  });

  it("should share a cold load across hooks and a mounted picker", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const view = render(
      <>
        <EmojiPicker.Root />
        <Lookup />
        <Lookup emoji="👍" />
      </>,
    );

    expect(await view.findByText("Red heart")).toBeVisible();
    expect(await view.findByText("Thumbs up")).toBeVisible();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("should return warm data immediately without a Suspense boundary, fetching, or storage reads", async () => {
    await defaultEmojiDataResolver("en", { emojiVersion: 5 });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const storageSpy = vi.spyOn(Storage.prototype, "getItem");
    const { result } = renderHook(() =>
      useEmojiDetails("❤️", { emojiVersion: 5 }),
    );

    expect(result.current).toBe(getEmojiDetails("❤️", { emojiVersion: 5 }));
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storageSpy).not.toHaveBeenCalled();
  });

  it("should change emojis and return undefined for unknown emojis without suspending again", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const view = render(<Lookup />);

    await view.findByText("Red heart");
    view.rerender(<Lookup emoji="👍🏽" />);
    expect(view.getByText("Thumbs up")).toBeVisible();
    view.rerender(<Lookup emoji="not an emoji" />);
    expect(view.getByText("Unknown emoji")).toBeVisible();
    expect(view.queryByText("Loading")).toBeNull();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("should suspend when the locale or source changes and reuse cached sources", async () => {
    const view = render(
      <Lookup
        options={{ locale: "en", emojibaseUrl: "https://example.com/first" }}
      />,
    );

    await view.findByText("Red heart");
    view.rerender(
      <Lookup
        options={{ locale: "fr", emojibaseUrl: "https://example.com/second" }}
      />,
    );
    expect(view.getByText("Loading")).toBeVisible();
    expect(view.getByText("Red heart")).not.toBeVisible();
    expect(await view.findByText("Cœur rouge")).toBeVisible();
    view.rerender(
      <Lookup
        options={{ locale: "en", emojibaseUrl: "https://example.com/first" }}
      />,
    );
    expect(view.getByText("Red heart")).toBeVisible();
    expect(view.queryByText("Loading")).toBeNull();
  });

  it("should preserve a suspended load when its component disappears", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const first = render(<Lookup />);

    first.unmount();
    await waitFor(() => expect(getEmojiDetails("❤️")).toBeDefined());
    expect(fetchSpy.mock.calls[0]?.[1]?.signal?.aborted).toBe(false);
    const second = render(<Lookup />);
    expect(second.getByText("Red heart")).toBeVisible();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("should deliver cached loading failures to error boundaries without retrying every render", async () => {
    const error = new Error("Offline");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(error);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const first = render(
      <ErrorBoundary>
        <Lookup />
      </ErrorBoundary>,
    );

    expect(first.getByText("Loading")).toBeVisible();
    expect(await first.findByRole("alert")).toHaveTextContent("Offline");
    expect(getEmojiDetails("❤️")).toBeUndefined();
    const second = render(
      <ErrorBoundary>
        <Lookup />
      </ErrorBoundary>,
    );
    expect(second.getAllByRole("alert")).toHaveLength(2);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("should recover after a picker loads the data and the error boundary resets", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Offline"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const boundary = createRef<ErrorBoundary>();
    const view = render(
      <ErrorBoundary ref={boundary}>
        <Lookup />
      </ErrorBoundary>,
    );

    await view.findByRole("alert");
    await act(async () => {
      await defaultEmojiDataResolver("en", {});
    });
    act(() => boundary.current?.setState({ error: null }));
    expect(view.getByText("Red heart")).toBeVisible();
    expect(view.queryByRole("alert")).toBeNull();
  });

  it("should share one request across Suspense retries and Strict Mode", async () => {
    const pending = pendingData();
    const resolveEmojiData = vi.fn(() => pending.promise);
    const view = render(
      <StrictMode>
        <Lookup emoji="😀" options={{ locale: "ne", resolveEmojiData }} />
      </StrictMode>,
    );

    await waitFor(() => expect(resolveEmojiData).toHaveBeenCalledTimes(1));
    view.rerender(
      <StrictMode>
        <Lookup emoji="😀" options={{ locale: "ne", resolveEmojiData }} />
      </StrictMode>,
    );
    await act(async () => {
      pending.resolve(customData);
    });
    expect(await view.findByText("हाँसेको अनुहार")).toBeVisible();
    expect(resolveEmojiData).toHaveBeenCalledTimes(1);
  });

  it("should include unsupported emojis with either form of the default resolver", async () => {
    const view = render(
      <>
        <Lookup emoji="🇳🇵" />
        <Lookup
          emoji="🇳🇵"
          options={{ resolveEmojiData: defaultEmojiDataResolver }}
        />
      </>,
    );

    await waitFor(() =>
      expect(view.getAllByText("Flag: Nepal")).toHaveLength(2),
    );
    expect(getEmojiDetails("🇳🇵")).toBe(
      getEmojiDetails("🇳🇵", { resolveEmojiData: defaultEmojiDataResolver }),
    );
  });

  it("should reuse data when browser storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("Unavailable");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Unavailable");
    });
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const view = render(<Lookup />);

    expect(await view.findByText("Red heart")).toBeVisible();
    expect(getEmojiDetails("❤️")).toBeDefined();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("should reuse custom picker data without calling the resolver and observe replacements", async () => {
    const data = { ...customData };
    const resolveEmojiData = vi.fn(() => data);
    const options = { locale: "ne", resolveEmojiData };
    const picker = render(<EmojiPicker.Root {...options} />);

    await waitFor(() =>
      expect(getEmojiDetails("😀", options)).toBe(customData.emojis[0]),
    );
    const { result } = renderHook(() => useEmojiDetails("😀", options));
    expect(result.current).toBe(customData.emojis[0]);
    expect(resolveEmojiData).toHaveBeenCalledTimes(1);
    picker.unmount();

    data.emojis = [{ ...customData.emojis[0]!, label: "Updated label" }];
    render(<EmojiPicker.Root {...options} />);
    await waitFor(() => expect(result.current?.label).toBe("Updated label"));
    expect(getEmojiDetails("😀", options)).toBe(data.emojis[0]);
  });

  it("should reveal data supplied by a picker before an older custom hook request finishes", async () => {
    const pending = pendingData();
    const replacement = {
      ...customData,
      emojis: [{ ...customData.emojis[0]!, label: "Updated label" }],
    };
    const resolveEmojiData = vi
      .fn<EmojiDataResolver>()
      .mockImplementationOnce(() => pending.promise)
      .mockReturnValue(replacement);
    const options = { locale: "ne", resolveEmojiData };
    const view = render(<Lookup emoji="😀" options={options} />);

    await waitFor(() => expect(resolveEmojiData).toHaveBeenCalledTimes(1));
    render(<EmojiPicker.Root {...options} />);
    expect(await view.findByText("Updated label")).toBeVisible();
    await act(async () => {
      pending.resolve(customData);
    });
    expect(getEmojiDetails("😀", options)).toBe(replacement.emojis[0]);
    expect(view.getByText("Updated label")).toBeVisible();
  });

  it("should deduplicate custom loads across hooks and keep resolvers and versions separate", async () => {
    const firstResolver = vi.fn(() => customData);
    const secondResolver = vi.fn(() => ({ ...customData, emojis: [] }));
    const options = {
      locale: "ne",
      emojiVersion: 5,
      resolveEmojiData: firstResolver,
    };
    const view = render(
      <>
        <Lookup emoji="😀" options={options} />
        <Lookup emoji="😀" options={options} />
        <Lookup
          emoji="😀"
          options={{ locale: "ne", resolveEmojiData: secondResolver }}
        />
      </>,
    );

    await waitFor(() =>
      expect(view.getAllByText("हाँसेको अनुहार")).toHaveLength(2),
    );
    expect(await view.findByText("Unknown emoji")).toBeVisible();
    expect(firstResolver).toHaveBeenCalledTimes(1);
    expect(secondResolver).toHaveBeenCalledTimes(1);
    expect(
      getEmojiDetails("😀", { locale: "ne", resolveEmojiData: firstResolver }),
    ).toBeUndefined();
    expect(firstResolver).toHaveBeenCalledWith("ne", {
      emojiVersion: 5,
      emojibaseUrl: undefined,
    });
  });

  it("should cache late results for their source without replacing the currently displayed data", async () => {
    const pending = pendingData();
    const resolveEmojiData = vi.fn<EmojiDataResolver>((locale) =>
      locale === "ne" ? pending.promise : { ...customData, locale, emojis: [] },
    );
    const view = render(
      <Lookup emoji="😀" options={{ locale: "ne", resolveEmojiData }} />,
    );

    await waitFor(() => expect(resolveEmojiData).toHaveBeenCalledTimes(1));
    view.rerender(
      <Lookup emoji="😀" options={{ locale: "other", resolveEmojiData }} />,
    );
    expect(await view.findByText("Unknown emoji")).toBeVisible();
    await act(async () => {
      pending.resolve(customData);
    });
    expect(view.getByText("Unknown emoji")).toBeVisible();
    expect(getEmojiDetails("😀", { locale: "ne", resolveEmojiData })).toBe(
      customData.emojis[0],
    );
  });

  it.each([
    "throw",
    "reject",
  ])("should send a custom resolver %s to an error boundary", async (failure) => {
    const resolveEmojiData = vi.fn(() => {
      if (failure === "throw") {
        throw "Unavailable";
      }
      return Promise.reject("Unavailable");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const boundary = createRef<ErrorBoundary>();
    const view = render(
      <ErrorBoundary ref={boundary}>
        <Lookup emoji="😀" options={{ resolveEmojiData }} />
      </ErrorBoundary>,
    );

    expect(await view.findByRole("alert")).toHaveTextContent(
      "Could not load emoji data",
    );
    expect(boundary.current?.state.error?.cause).toBe("Unavailable");
    expect(resolveEmojiData).toHaveBeenCalledTimes(1);
  });

  it("should show the Suspense fallback on the server without loading and recover on the client", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const html = renderToString(<Lookup />);

    expect(html).toContain("Loading");
    expect(fetchSpy).not.toHaveBeenCalled();
    const container = document.createElement("div");
    container.innerHTML = html;
    document.body.append(container);
    const onRecoverableError = vi.fn();
    const view = render(<Lookup />, {
      container,
      hydrate: true,
      onRecoverableError,
    });

    expect(await view.findByText("Red heart")).toBeVisible();
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(onRecoverableError).toHaveBeenCalledTimes(1);
    expect(renderToString(<Lookup />)).toContain("Loading");
  });
});
