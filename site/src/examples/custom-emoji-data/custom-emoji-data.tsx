import type { ComponentProps } from "react";
import { CodeBlock } from "@/components/ui/code-block";
import { cn } from "@/lib/utils";
import { CustomEmojiDataPreview } from "./custom-emoji-data.client";

export function CustomEmojiData({
  className,
  ...props
}: Omit<ComponentProps<"figure">, "children">) {
  return (
    <figure
      className={cn("not-prose relative overflow-hidden", className)}
      {...props}
    >
      <div className="flex items-center justify-center rounded-t-lg border border-b-0 border-dotted bg-background">
        <CustomEmojiDataPreview />
      </div>
      <CodeBlock className="max-h-[304px] rounded-t-none" lang="tsx">{`
        // [!code word:resolveEmojiData]
        "use client";

        import {
          EmojiPicker,
          defaultEmojiDataResolver,
          type EmojiData,
        } from "frimousse";

        // Emojibase doesn't provide a Turkish dataset, so this one is hand-written.
        const myEmojiData: Record<string, EmojiData> = {
          tr: {
            locale: "tr",
            categories: [
              { index: 0, label: "Suratlar ve duygular" },
              { index: 1, label: "İnsanlar ve vücut" },
              // …
            ],
            emojis: [
              {
                emoji: "😀",
                category: 0,
                label: "sırıtan yüz",
                version: 1,
                tags: ["yüz", "gülümseme", "mutlu"],
              },
              {
                emoji: "👋",
                category: 1,
                label: "el sallama",
                version: 0.6,
                tags: ["merhaba", "selam", "hoşça kal"],
                skins: { light: "👋🏻", "medium-light": "👋🏼", medium: "👋🏽", "medium-dark": "👋🏾", dark: "👋🏿" },
              },
              // …
            ],
            skinTones: {
              light: "açık ten",
              "medium-light": "orta açık ten",
              medium: "orta ten",
              "medium-dark": "orta koyu ten",
              dark: "koyu ten",
            },
          },
        };

        export function MyEmojiPicker({ locale }: { locale: string }) {
          return (
            <EmojiPicker.Root
              locale={locale}
              resolveEmojiData={(locale, options) =>
                myEmojiData[locale] ?? defaultEmojiDataResolver(locale, options)
              }
            >
              {/* … */}
            </EmojiPicker.Root>
          );
        }
      `}</CodeBlock>
    </figure>
  );
}
