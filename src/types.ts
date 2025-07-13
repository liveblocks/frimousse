import type {
  Emoji as EmojibaseEmoji,
  Group as EmojibaseGroup,
  Locale as EmojibaseLocale,
  SkinToneKey as EmojibaseSkinToneKey,
} from "emojibase/lib/types";
import type { ComponentProps, ComponentType, ReactNode } from "react";

type Resolve<T> = T extends (...args: unknown[]) => unknown
  ? T
  : { [K in keyof T]: T[K] };

export type WithAttributes<T> = T & {
  [attribute: `frimousse-${string}` | `data-${string}`]:
    | string
    | number
    | undefined;
};

export type {
  Emoji as EmojibaseEmoji,
  MessagesDataset as EmojibaseMessagesDataset,
  SkinTone as EmojibaseSkinTone,
} from "emojibase/lib/types";

export type EmojibaseEmojiWithGroup = EmojibaseEmoji & {
  group: EmojibaseGroup;
};

export type Locale = Resolve<EmojibaseLocale>;

export type SkinTone = Resolve<"none" | EmojibaseSkinToneKey>;

export type SkinToneVariation = {
  skinTone: SkinTone;
  emoji: string;
};

export type Emoji = Resolve<EmojiPickerEmoji>;

export type Category = Resolve<EmojiPickerCategory>;

export type EmojiDataEmoji = {
  emoji: string;
  category: number;
  label: string;
  version: number;
  tags: string[];
  countryFlag: true | undefined;
  skins: Record<Exclude<SkinTone, "none">, string> | undefined;
};

export type EmojiDataCategory = {
  index: number;
  label: string;
};

export type EmojiData = {
  locale: Locale;
  emojis: EmojiDataEmoji[];
  categories: EmojiDataCategory[];
  skinTones: Record<Exclude<SkinTone, "none">, string>;
};

export type EmojiPickerEmoji = {
  emoji: string;
  label: string;
};

export type EmojiPickerCategory = {
  label: string;
};

export type EmojiPickerDataRow = {
  categoryIndex: number;
  emojis: EmojiPickerEmoji[];
};

export type EmojiPickerDataCategory = {
  label: string;
  rowsCount: number;
  startRowIndex: number;
};

export type EmojiPickerData = {
  count: number;
  categories: EmojiPickerDataCategory[];
  categoriesStartRowIndices: number[];
  rows: EmojiPickerDataRow[];
  skinTones: Record<Exclude<SkinTone, "none">, string>;
};

export type EmojiPickerListComponents = {
  /**
   * The component used to render a sticky category header in the list.
   *
   * @details
   * All category headers should be of the same size.
   */
  CategoryHeader: ComponentType<EmojiPickerListCategoryHeaderProps>;

  /**
   * The component used to render a row of emojis in the list.
   *
   * @details
   * All rows should be of the same size.
   */
  Row: ComponentType<EmojiPickerListRowProps>;

  /**
   * The component used to render an emoji button in the list.
   *
   * @details
   * All emojis should be of the same size.
   */
  Emoji: ComponentType<EmojiPickerListEmojiProps>;
};

export type EmojiPickerListRowProps = ComponentProps<"div">;

export interface EmojiPickerListCategoryHeaderProps
  extends Omit<ComponentProps<"div">, "children"> {
  /**
   * The category for this sticky header.
   */
  category: Category;
}

export interface EmojiPickerListEmojiProps
  extends Omit<ComponentProps<"button">, "children"> {
  /**
   * The emoji for this button, its label, and whether the emoji is currently
   * active (either hovered or selected via keyboard navigation).
   */
  emoji: Resolve<Emoji & { isActive: boolean }>;
}

export interface EmojiPickerListProps extends ComponentProps<"div"> {
  /**
   * The inner components of the list.
   */
  components?: Partial<EmojiPickerListComponents>;
}

export interface EmojiPickerRootProps extends ComponentProps<"div"> {
  /**
   * A callback invoked when an emoji is selected.
   */
  onEmojiSelect?: (emoji: Emoji) => void;

  /**
   * The locale of the emoji picker.
   *
   * @default "en"
   */
  locale?: Locale;

  /**
   * The skin tone of the emoji picker.
   *
   * @default "none"
   */
  skinTone?: SkinTone;

  /**
   * The number of columns in the list.
   *
   * @default 10
   */
  columns?: number;

  /**
   * Which {@link https://emojipedia.org/emoji-versions | Emoji version} to use,
   * to manually control which emojis are visible regardless of the current
   * browser's supported Emoji versions.
   *
   * @default The most recent version supported by the current browser
   */
  emojiVersion?: number;

  /**
   * The base URL of where the {@link https://emojibase.dev/docs/datasets/ | Emojibase data}
   * should be fetched from, used as follows: `${emojibaseUrl}/${locale}/${file}.json`.
   * (e.g. `${emojibaseUrl}/en/data.json`).
   *
   * The URL can be set to another CDN hosting the {@link https://www.npmjs.com/package/emojibase-data | `emojibase-data`}
   * package and its raw JSON files, or to a self-hosted location. When self-hosting
   * with a single locale (e.g. `en`), only that locale's directory needs to be hosted
   * instead of the entire package.
   *
   * @example "https://unpkg.com/emojibase-data"
   *
   * @example "https://example.com/self-hosted-emojibase-data"
   *
   * @default "https://cdn.jsdelivr.net/npm/emojibase-data"
   */
  emojibaseUrl?: string;

  /**
   * Whether to enable the sticky position of the category headers.
   *
   * @default true
   */
  sticky?: boolean;
}

export type EmojiPickerViewportProps = ComponentProps<"div">;

export type EmojiPickerSearchProps = ComponentProps<"input">;

export interface EmojiPickerSkinToneSelectorProps
  extends Omit<ComponentProps<"button">, "children"> {
  /**
   * The emoji to use as visual for the skin tone variations.
   *
   * @default "✋"
   */
  emoji?: string;
}

export type EmojiPickerLoadingProps = ComponentProps<"span">;

export type EmojiPickerEmptyRenderProps = {
  /**
   * The current search value.
   */
  search: string;
};

export interface EmojiPickerEmptyProps
  extends Omit<ComponentProps<"span">, "children"> {
  /**
   * The content to render when no emoji is found for the current search, or
   * a render callback which receives the current search value.
   */
  children?: ReactNode | ((props: EmojiPickerEmptyRenderProps) => ReactNode);
}

export type EmojiPickerActiveEmojiRenderProps = {
  /**
   * The currently active emoji (either hovered or selected
   * via keyboard navigation).
   */
  emoji?: Emoji;
};

export type EmojiPickerActiveEmojiProps = {
  /**
   * A render callback which receives the currently active emoji (either hovered or selected
   * via keyboard navigation).
   */
  children: (props: EmojiPickerActiveEmojiRenderProps) => ReactNode;
};

export type EmojiPickerSkinToneRenderProps = {
  /**
   * The current skin tone.
   */
  skinTone: SkinTone;

  /**
   * A function to change the current skin tone.
   */
  setSkinTone: (skinTone: SkinTone) => void;

  /**
   * The skin tone variations of the specified emoji.
   */
  skinToneVariations: SkinToneVariation[];
};

export type EmojiPickerSkinToneProps = {
  /**
   * The emoji to use as visual for the skin tone variations.
   *
   * @default "✋"
   */
  emoji?: string;

  /**
   * A render callback which receives the current skin tone and a function
   * to change it, as well as the skin tone variations of the specified emoji.
   */
  children: (props: EmojiPickerSkinToneRenderProps) => ReactNode;
};
