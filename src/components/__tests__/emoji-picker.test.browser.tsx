import { page, userEvent } from "@vitest/browser/context";
import { Children, type ReactNode, useState } from "react";
import { describe, expect, it } from "vitest";
import type {
  Emoji,
  EmojiPickerEmptyProps,
  EmojiPickerListProps,
  EmojiPickerRootProps,
  EmojiPickerSearchProps,
  Locale,
  SkinTone,
} from "../../types";
import * as EmojiPicker from "../emoji-picker";

const EMOJI_BUTTON_HEIGHT = 28;

function DefaultPage({
  children,
  locale,
  columns = 10,
  skinTone,
  emojiVersion = 12,
  listComponents,
  viewportHeight = 400,
  searchDefaultValue,
  searchValue,
  searchOnChange,
  rootChildren,
  emptyChildren = <div data-testid="empty">No emojis found</div>,
  sticky = true,
}: {
  children?: ReactNode;
  locale?: EmojiPickerRootProps["locale"];
  columns?: EmojiPickerRootProps["columns"];
  skinTone?: EmojiPickerRootProps["skinTone"];
  emojiVersion?: EmojiPickerRootProps["emojiVersion"];
  listComponents?: EmojiPickerListProps["components"];
  viewportHeight?: number;
  searchDefaultValue?: EmojiPickerSearchProps["defaultValue"];
  searchOnChange?: EmojiPickerSearchProps["onChange"];
  searchValue?: EmojiPickerSearchProps["value"];
  rootChildren?: EmojiPickerRootProps["children"];
  emptyChildren?: EmojiPickerEmptyProps["children"];
  sticky?: EmojiPickerRootProps["sticky"];
}) {
  const [selectedEmoji, setSelectedEmoji] = useState<Emoji | null>(null);

  return (
    <>
      <div>
        <p data-testid="selected-emoji">{selectedEmoji?.emoji}</p>
        {children}
      </div>
      <div>
        <EmojiPicker.Root
          columns={columns}
          data-testid="root"
          emojiVersion={emojiVersion}
          locale={locale}
          onEmojiSelect={setSelectedEmoji}
          skinTone={skinTone}
          sticky={sticky}
        >
          <EmojiPicker.Search
            data-testid="search"
            defaultValue={searchDefaultValue}
            onChange={searchOnChange}
            value={searchValue}
          />
          <EmojiPicker.Loading data-testid="loading">
            Loading…
          </EmojiPicker.Loading>
          <EmojiPicker.Empty>{emptyChildren}</EmojiPicker.Empty>
          <EmojiPicker.Viewport
            data-testid="viewport"
            style={{ height: viewportHeight }}
          >
            <EmojiPicker.List
              components={{
                Emoji: ({ emoji, style, ...props }) => (
                  <button
                    style={{ height: EMOJI_BUTTON_HEIGHT, ...style }}
                    {...props}
                  >
                    {emoji.emoji}
                  </button>
                ),
                ...listComponents,
              }}
              data-testid="list"
            />
          </EmojiPicker.Viewport>
          {rootChildren}
        </EmojiPicker.Root>
      </div>
    </>
  );
}

describe("EmojiPicker", () => {
  it("should render parts", async () => {
    page.render(<DefaultPage />);

    await expect.element(page.getByTestId("root")).toBeInTheDocument();
    await expect.element(page.getByTestId("search")).toBeInTheDocument();
    await expect.element(page.getByTestId("viewport")).toBeInTheDocument();
    await expect.element(page.getByTestId("list")).toBeInTheDocument();
  });

  it("should have proper accessibility attributes", async () => {
    page.render(<DefaultPage />);

    await expect
      .element(page.getByTestId("list"))
      .toHaveAttribute("role", "grid");
    await expect
      .element(page.getByTestId("list"))
      .toHaveAttribute("aria-rowcount");
    await expect
      .element(page.getByTestId("list"))
      .toHaveAttribute("aria-colcount");

    const rows = page.getByRole("row");

    await expect.element(rows.nth(5)).toHaveAttribute("aria-rowindex", "5");

    const emojis = page.getByRole("gridcell");

    await expect.element(emojis.first()).toHaveAttribute("role", "gridcell");
    await expect.element(emojis.first()).toHaveAttribute("aria-colindex", "0");

    await emojis.nth(2).hover();
    await emojis.first().hover();

    await expect.element(emojis.first()).toHaveAttribute("aria-selected");

    await expect
      .element(page.getByTestId("search"))
      .toHaveAttribute("type", "search");
  });

  it("should have the expected data attributes", async () => {
    page.render(
      <DefaultPage
        listComponents={{
          Emoji: ({ emoji, style, ...props }) => (
            <button
              data-testid={`emoji: ${emoji.emoji}`}
              style={{ height: EMOJI_BUTTON_HEIGHT, ...style }}
              type="button"
              {...props}
            >
              {emoji.isActive ? emoji.emoji : null}
            </button>
          ),
        }}
      />,
    );

    await expect
      .element(page.getByTestId("root"))
      .not.toHaveAttribute("data-focused");

    await page.getByTestId("search").click();

    await expect
      .element(page.getByTestId("root"))
      .toHaveAttribute("data-focused");

    await expect
      .element(page.getByTestId("emoji: 😀"))
      .not.toHaveAttribute("data-active");

    await page.getByTestId("emoji: 😀").hover();

    await expect
      .element(page.getByTestId("emoji: 😀"))
      .toHaveAttribute("data-active");
  });

  it("should support selecting an emoji on click", async () => {
    page.render(<DefaultPage />);

    await page.getByText("😀").click();

    await expect
      .element(page.getByTestId("selected-emoji"))
      .toHaveTextContent("😀");
  });

  it("should support navigating and selecting an emoji with the keyboard", async () => {
    page.render(<DefaultPage columns={4} />);

    await page.getByTestId("search").click();

    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{Enter}");

    await expect
      .element(page.getByTestId("selected-emoji"))
      .toHaveTextContent("😀");

    await userEvent.keyboard("{ArrowRight>4/}");
    await userEvent.keyboard("{ArrowLeft>2/}");
    await userEvent.keyboard("{ArrowBottom}");
    await userEvent.keyboard("{ArrowLeft}");
    await userEvent.keyboard("{ArrowTop}");
    await userEvent.keyboard("{ArrowLeft}");
    await userEvent.keyboard("{Enter}");

    await expect
      .element(page.getByTestId("selected-emoji"))
      .toHaveTextContent("😀");
  });

  it("should scroll the viewport when navigating with the keyboard", async () => {
    page.render(
      <DefaultPage
        listComponents={{
          Emoji: ({ emoji, style, ...props }) => (
            <button
              {...props}
              style={{
                ...style,
                height: EMOJI_BUTTON_HEIGHT,
                background: emoji.isActive ? "red" : undefined,
              }}
            >
              {emoji.emoji}
            </button>
          ),
        }}
        viewportHeight={125}
      />,
    );

    await page.getByTestId("search").click();

    await userEvent.keyboard("{ArrowDown>5/}");
    await userEvent.keyboard("{Enter}");

    await expect
      .element(page.getByTestId("selected-emoji"))
      .toHaveTextContent("🤥");

    await userEvent.keyboard("{ArrowUp>5/}");
    await userEvent.keyboard("{Enter}");

    await expect
      .element(page.getByTestId("selected-emoji"))
      .toHaveTextContent("😀");

    await userEvent.keyboard("{ArrowRight>16/}");
    await userEvent.keyboard("{ArrowDown>60/}");
    await userEvent.keyboard("{Enter}");

    await expect
      .element(page.getByTestId("selected-emoji"))
      .toHaveTextContent("🍇");

    await userEvent.keyboard("{ArrowRight}");
    await userEvent.keyboard("{ArrowUp>80/}");
    await userEvent.keyboard("{ArrowLeft>10/}");
    await userEvent.keyboard("{Enter}");

    await expect
      .element(page.getByTestId("selected-emoji"))
      .toHaveTextContent("😀");

    // Losing focus will reset the active emoji and will make
    // the keyboard navigation start from the first emoji
    await userEvent.tab({ shift: true });

    await page.getByTestId("search").click();

    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{Enter}");

    await expect
      .element(page.getByTestId("selected-emoji"))
      .toHaveTextContent("😀");
  });

  it("should reset the active emoji when losing focus", async () => {
    page.render(
      <DefaultPage
        rootChildren={
          <EmojiPicker.ActiveEmoji>
            {({ emoji }) =>
              emoji ? <p data-testid="active-emoji">{emoji.label}</p> : null
            }
          </EmojiPicker.ActiveEmoji>
        }
      />,
    );

    await page.getByTestId("search").click();

    await userEvent.keyboard("{ArrowDown}");

    await expect
      .element(page.getByTestId("active-emoji"))
      .toHaveTextContent("Grinning face");

    await userEvent.tab({ shift: true });

    await expect
      .element(page.getByTestId("active-emoji"))
      .not.toBeInTheDocument();
  });

  it("should fallback to default values for unsupported locales and skin tones", async () => {
    page.render(
      <DefaultPage
        locale={"unsupported" as Locale}
        skinTone={"unsupported" as SkinTone}
      />,
    );

    await expect
      .element(page.getByText("Smileys & Emotion"))
      .toBeInTheDocument();

    await page.getByTestId("search").fill("holding");

    await expect.element(page.getByText("🧑‍🤝‍🧑")).toBeInTheDocument();
  });
});

describe("EmojiPicker.Root", () => {
  it("should support an initial locale and changing it", async () => {
    function Page() {
      const [locale, setLocale] =
        useState<EmojiPickerRootProps["locale"]>("fr");

      return (
        <DefaultPage locale={locale}>
          <button
            data-testid="set-locale-en"
            onClick={() => setLocale("en")}
            type="button"
          >
            Switch to English
          </button>
        </DefaultPage>
      );
    }

    page.render(<Page />);

    await expect
      .element(page.getByText("Smileys et émotion"))
      .toBeInTheDocument();

    await page.getByTestId("set-locale-en").click();

    await expect
      .element(page.getByText("Smileys & Emotion"))
      .toBeInTheDocument();
  });

  it("should support an initial skin tone and changing it", async () => {
    function Page() {
      const [skinTone, setSkinTone] =
        useState<EmojiPickerRootProps["skinTone"]>("dark");

      return (
        <DefaultPage
          searchDefaultValue="holding"
          skinTone={skinTone}
          viewportHeight={2000}
        >
          <button
            data-testid="set-skin-tone-none"
            onClick={() => setSkinTone("none")}
            type="button"
          >
            Change skin tone to none
          </button>
        </DefaultPage>
      );
    }

    page.render(<Page />);

    await expect.element(page.getByText("🧑🏿‍🤝‍🧑🏿")).toBeInTheDocument();

    await page.getByTestId("set-skin-tone-none").click();

    await expect.element(page.getByText("🧑‍🤝‍🧑")).toBeInTheDocument();
  });

  it("should support an initial columns count and changing it", async () => {
    function Page() {
      const [columns, setColumns] = useState(5);

      return (
        <DefaultPage
          columns={columns}
          listComponents={{
            Row: ({ children, ...props }) => (
              <div {...props}>
                {Children.count(children)} {children}
              </div>
            ),
          }}
        >
          <button
            data-testid="set-columns-8"
            onClick={() => setColumns(8)}
            type="button"
          >
            Switch to 8 columns
          </button>
        </DefaultPage>
      );
    }

    page.render(<Page />);

    await expect
      .element(page.getByRole("gridcell").nth(4))
      .toHaveAttribute("aria-colindex", "4");
    await expect
      .element(page.getByRole("gridcell").nth(5))
      .toHaveAttribute("aria-colindex", "0");
    await expect
      .element(page.getByRole("gridcell").nth(9))
      .toHaveAttribute("aria-colindex", "4");

    await page.getByTestId("set-columns-8").click();

    await expect
      .element(page.getByRole("gridcell").nth(7))
      .toHaveAttribute("aria-colindex", "7");
  });

  it("should support disabling sticky category headers", async () => {
    page.render(
      <DefaultPage
        sticky={false}
        listComponents={{
          CategoryHeader: ({ category, ...props }) => (
            <div
              data-testid="category-header"
              {...props}
            >
              {category.label}
            </div>
          ),
        }}
      />,
    );

    await expect.element(page.getByTestId("category-header").nth(1)).not.toHaveStyle({
      position: "sticky",
    });
  });
});

describe("EmojiPicker.Search", () => {
  it("should support searching", async () => {
    page.render(<DefaultPage />);

    await page.getByTestId("search").fill("cat");

    await expect.element(page.getByText("🐈")).toBeInTheDocument();
  });

  it("should support a default search value", async () => {
    page.render(<DefaultPage searchDefaultValue="hello" />);

    await expect.element(page.getByTestId("search")).toHaveValue("hello");
  });

  it("should support a controlled search value", async () => {
    function Page() {
      const [search, setSearch] = useState("");

      return (
        <DefaultPage
          searchOnChange={(event) => setSearch(event.target.value)}
          searchValue={search}
        />
      );
    }

    page.render(<Page />);

    await expect.element(page.getByTestId("search")).toHaveValue("");

    await page.getByTestId("search").fill("cat");
    await expect.element(page.getByTestId("search")).toHaveValue("cat");
    await expect.element(page.getByText("🐈")).toBeInTheDocument();

    await page.getByTestId("search").fill("123456789");
    await expect.element(page.getByTestId("search")).toHaveValue("123456789");
    await expect.element(page.getByTestId("empty")).toBeInTheDocument();
  });

  it("should support an external controlled search value", async () => {
    function Page() {
      const [search, setSearch] = useState("");

      return (
        <DefaultPage
          searchOnChange={(event) => setSearch(event.target.value)}
          searchValue={search}
        >
          <input
            data-testid="controlled-search"
            onChange={(event) => setSearch(event.target.value)}
            type="text"
          />
        </DefaultPage>
      );
    }

    page.render(<Page />);

    await expect.element(page.getByTestId("search")).toHaveValue("");

    await page.getByTestId("controlled-search").fill("cat");
    await expect.element(page.getByTestId("search")).toHaveValue("cat");
    await expect.element(page.getByText("🐈")).toBeInTheDocument();

    await page.getByTestId("controlled-search").fill("123456789");
    await expect.element(page.getByTestId("search")).toHaveValue("123456789");
    await expect.element(page.getByTestId("empty")).toBeInTheDocument();
  });
});

describe("EmojiPicker.Viewport", () => {
  it("should virtualize rows based on the viewport height", async () => {
    function Page() {
      const [viewportHeight, setViewportHeight] = useState(400);
      const [rowHeight, setRowHeight] = useState(30);
      const [categoryHeaderHeight, setCategoryHeaderHeight] = useState(30);

      return (
        <DefaultPage
          listComponents={{
            Row: ({ children, style, ...props }) => (
              <div
                data-testid="custom-row"
                {...props}
                style={{ ...style, height: rowHeight }}
              >
                {children}
              </div>
            ),
            CategoryHeader: ({ category, style, ...props }) => (
              <div
                data-testid="custom-category-header"
                {...props}
                style={{ ...style, height: categoryHeaderHeight }}
              >
                {category.label}
              </div>
            ),
          }}
        >
          <input
            data-testid="viewport-height"
            onChange={(event) => setViewportHeight(Number(event.target.value))}
            type="number"
            value={viewportHeight}
          />
          <input
            data-testid="row-height"
            onChange={(event) => setRowHeight(Number(event.target.value))}
            type="number"
            value={rowHeight}
          />
          <input
            data-testid="category-header-height"
            onChange={(event) =>
              setCategoryHeaderHeight(Number(event.target.value))
            }
            type="number"
            value={categoryHeaderHeight}
          />
        </DefaultPage>
      );
    }

    page.render(<Page />);

    await expect.element(page.getByText("😀")).toBeInTheDocument();

    await expect.element(page.getByRole("row").nth(10)).toBeInTheDocument();
    await expect.element(page.getByRole("row").nth(20)).not.toBeInTheDocument();

    await page.getByTestId("viewport-height").fill("500");
    await page.getByTestId("row-height").fill("20");
    await page.getByTestId("category-header-height").fill("20");

    await expect.element(page.getByRole("row").nth(10)).toBeInTheDocument();
    await expect.element(page.getByRole("row").nth(20)).toBeInTheDocument();

    await page.getByTestId("viewport-height").fill("200");
    await page.getByTestId("row-height").fill("100");
    await page.getByTestId("category-header-height").fill("400");

    await expect.element(page.getByRole("row").nth(10)).not.toBeInTheDocument();
    await expect.element(page.getByRole("row").nth(20)).not.toBeInTheDocument();
  });

  it("should virtualize rows based on scroll", async () => {
    function Page() {
      const scrollViewport = () => {
        const viewport = document.querySelector("[data-testid='viewport']");

        viewport?.scrollBy({
          top: 500,
          behavior: "smooth",
        });
      };

      return (
        <DefaultPage viewportHeight={200}>
          <button
            data-testid="scroll-viewport"
            onClick={scrollViewport}
            type="button"
          >
            Scroll viewport
          </button>
        </DefaultPage>
      );
    }

    page.render(<Page />);

    await expect
      .element(page.getByRole("row").nth(5))
      .toHaveAttribute("aria-rowindex", "5");
    await expect.element(page.getByRole("row").nth(20)).not.toBeInTheDocument();

    await page.getByTestId("scroll-viewport").click();

    await expect
      .element(page.getByRole("row").nth(5))
      .toHaveAttribute("aria-rowindex", "20");

    await page.getByTestId("scroll-viewport").click();

    await expect
      .element(page.getByRole("row").nth(5))
      .toHaveAttribute("aria-rowindex", "38");
  });
});

describe("EmojiPicker.List", () => {
  it("should support passing custom components", async () => {
    page.render(
      <DefaultPage
        listComponents={{
          Emoji: ({ emoji, style, ...props }) => (
            <button
              data-testid={`custom-emoji: ${emoji.emoji}`}
              style={{ height: EMOJI_BUTTON_HEIGHT, ...style }}
              type="button"
              {...props}
            >
              {emoji.label}
            </button>
          ),
          Row: ({ children, ...props }) => (
            <div {...props} aria-label="Custom row">
              {children}
            </div>
          ),
          CategoryHeader: ({ category }) => (
            <div data-testid={`custom-category-header: ${category.label}`}>
              Custom ({category.label})
            </div>
          ),
        }}
      />,
    );

    await expect
      .element(page.getByTestId("custom-emoji: 😊"))
      .toHaveTextContent("Smiling face with smiling eyes");
    await expect
      .element(page.getByRole("row").nth(10))
      .toHaveAccessibleName("Custom row");
    await expect
      .element(page.getByTestId("custom-category-header: Activities"))
      .toHaveTextContent("Custom (Activities)");
  });
});

describe("EmojiPicker.SkinToneSelector", () => {
  it("should display the current skin tone and change to the next one on click", async () => {
    page.render(
      <DefaultPage
        rootChildren={
          <EmojiPicker.SkinToneSelector
            data-testid="skin-tone-selector"
            emoji="👸"
          />
        }
        skinTone="medium"
      />,
    );

    await expect
      .element(page.getByTestId("skin-tone-selector"))
      .toHaveTextContent("👸🏽");

    await page.getByTestId("skin-tone-selector").click();

    await expect
      .element(page.getByTestId("skin-tone-selector"))
      .toHaveTextContent("👸🏾");

    await page.getByTestId("skin-tone-selector").click();

    await expect
      .element(page.getByTestId("skin-tone-selector"))
      .toHaveTextContent("👸🏿");

    await page.getByTestId("skin-tone-selector").click();

    await expect
      .element(page.getByTestId("skin-tone-selector"))
      .toHaveTextContent("👸");

    await page.getByTestId("skin-tone-selector").click();

    await expect
      .element(page.getByTestId("skin-tone-selector"))
      .toHaveTextContent("👸🏻");

    await page.getByTestId("skin-tone-selector").click();

    await expect
      .element(page.getByTestId("skin-tone-selector"))
      .toHaveTextContent("👸🏼");
  });

  it("should be correctly labelled", async () => {
    page.render(
      <DefaultPage
        rootChildren={
          <EmojiPicker.SkinToneSelector data-testid="skin-tone-selector" />
        }
        skinTone="medium"
      />,
    );

    await expect
      .element(page.getByTestId("skin-tone-selector"))
      .toHaveAccessibleName("Change skin tone (Medium-dark skin tone)");

    await page.getByTestId("skin-tone-selector").click();

    await expect
      .element(page.getByTestId("skin-tone-selector"))
      .toHaveAccessibleName("Change skin tone (Dark skin tone)");

    await page.getByTestId("skin-tone-selector").click();

    await expect
      .element(page.getByTestId("skin-tone-selector"))
      .toHaveAccessibleName("Change skin tone");

    await page.getByTestId("skin-tone-selector").click();

    await expect
      .element(page.getByTestId("skin-tone-selector"))
      .toHaveAccessibleName("Change skin tone (Light skin tone)");

    await page.getByTestId("skin-tone-selector").click();

    await expect
      .element(page.getByTestId("skin-tone-selector"))
      .toHaveAccessibleName("Change skin tone (Medium-light skin tone)");

    await page.getByTestId("skin-tone-selector").click();

    await expect
      .element(page.getByTestId("skin-tone-selector"))
      .toHaveAccessibleName("Change skin tone (Medium skin tone)");
  });
});

describe("EmojiPicker.Loading", () => {
  it("should render when loading emojis", async () => {
    page.render(<DefaultPage />);

    await expect.element(page.getByTestId("loading")).toBeInTheDocument();
  });
});

describe("EmojiPicker.Empty", () => {
  it("should render when no emojis are found", async () => {
    page.render(<DefaultPage />);

    await page.getByTestId("search").fill("..........");

    await expect
      .element(page.getByTestId("empty"))
      .toHaveTextContent("No emojis found");
  });

  it("should support displaying the search value", async () => {
    page.render(
      <DefaultPage
        emptyChildren={({ search }) => (
          <div data-testid="empty">{`No emojis found for ${search}`}</div>
        )}
      />,
    );

    await page.getByTestId("search").fill("..........");

    await expect
      .element(page.getByTestId("empty"))
      .toHaveTextContent("No emojis found for ..........");
  });
});

describe("EmojiPicker.ActiveEmoji", () => {
  it("should expose the active emoji", async () => {
    page.render(
      <DefaultPage
        rootChildren={
          <EmojiPicker.ActiveEmoji>
            {({ emoji }) =>
              emoji ? <div data-testid="active-emoji">{emoji.label}</div> : null
            }
          </EmojiPicker.ActiveEmoji>
        }
      />,
    );

    await expect
      .element(page.getByTestId("active-emoji"))
      .not.toBeInTheDocument();

    await page.getByText("😀").hover();

    await expect
      .element(page.getByTestId("active-emoji"))
      .toHaveTextContent("Grinning face");

    await page.getByText("😊").hover();

    await expect
      .element(page.getByTestId("active-emoji"))
      .toHaveTextContent("Smiling face with smiling eyes");
  });
});

describe("EmojiPicker.SkinTone", () => {
  it("should expose the current skin tone and allow changing it", async () => {
    page.render(
      <DefaultPage
        rootChildren={
          <EmojiPicker.SkinTone>
            {({ skinTone, setSkinTone }) => (
              <div>
                <p data-testid="skin-tone">{skinTone}</p>
                <button
                  data-testid="set-skin-tone-dark"
                  onClick={() => setSkinTone("dark")}
                  type="button"
                >
                  Change skin tone to dark
                </button>
              </div>
            )}
          </EmojiPicker.SkinTone>
        }
      />,
    );

    await expect
      .element(page.getByTestId("skin-tone"))
      .toHaveTextContent("none");

    await page.getByTestId("set-skin-tone-dark").click();

    await expect
      .element(page.getByTestId("skin-tone"))
      .toHaveTextContent("dark");
  });
});
