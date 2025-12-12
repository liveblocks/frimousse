import type { ComponentProps } from "react";
import { buttonVariants } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { cn } from "@/lib/utils";
import { ShadcnUiCustomEmojisPreview } from "./shadcnui-custom-emojis.client";

export function ShadcnUiCustomEmojis({
  className,
  ...props
}: Omit<ComponentProps<"figure">, "children">) {
  return (
    <figure
      className={cn("not-prose relative overflow-hidden", className)}
      {...props}
    >
      <div className="relative isolate flex items-center justify-center rounded-t-lg border border-b-0 border-dotted bg-background">
        <a
          className={cn(
            buttonVariants({ size: "sm", variant: "ghost" }),
            "absolute top-1.5 right-1.5 z-10",
          )}
          href="https://v0.dev/chat/api/open?url=https://frimousse.liveblocks.io/r/v0/emoji-picker-popover"
          rel="noreferrer"
          target="_blank"
        >
          <span className="mx-px inline-flex items-center gap-1">
            Open in{" "}
            <svg
              className="size-4.5 leading-none"
              fill="currentColor"
              fillRule="evenodd"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <title>v0</title>
              <path
                clipRule="evenodd"
                d="M14.252 8.25h5.624c.088 0 .176.006.26.018l-5.87 5.87a1.889 1.889 0 01-.019-.265V8.25h-2.25v5.623a4.124 4.124 0 004.125 4.125h5.624v-2.25h-5.624c-.09 0-.179-.006-.265-.018l5.874-5.875a1.9 1.9 0 01.02.27v5.623H24v-5.624A4.124 4.124 0 0019.876 6h-5.624v2.25zM0 7.5v.006l7.686 9.788c.924 1.176 2.813.523 2.813-.973V7.5H8.25v6.87L2.856 7.5H0z"
              />
            </svg>
          </span>
        </a>
        <ShadcnUiCustomEmojisPreview />
      </div>
      <CodeBlock className="max-h-[304px] rounded-t-none" lang="tsx">{`
          "use client";

          import * as React from "react";

          import {
            EmojiPicker,
            EmojiPickerSearch,
            EmojiPickerContent,
            EmojiPickerFooter,
          } from "@/components/ui/emoji-picker";

          export default function Page() {
            const customEmojis: Emoji[] = [];

            for (let i = 0; i < 15; i++) {
              customEmojis.push({
                emoji:
                  "https://cdn.discordapp.com/emojis/1314725686359101532.webp?size=48&test=" +
                  i,
                label: "GWAAA" + i,
                tags: ["gwaaa" + i],
                isCustom: true,
                category: 1, // References the category with id: 1
              });
              customEmojis.push({
                emoji:
                  "https://cdn.discordapp.com/emojis/1384584623497154743.webp?size=48&test=" +
                  i,
                label: "Oopsie" + i,
                tags: ["oopsie" + i],
                isCustom: true,
                category: 2, // References the category with id: 2
              });
              customEmojis.push({
                emoji:
                  "https://cdn.discordapp.com/emojis/1248889599518834779.webp?size=48&test=" +
                  i,
                label: "sunfire" + i,
                tags: ["sunfire" + i],
                isCustom: true,
                category: 3, // References the category with id: 3
              });
            }

            const customCategories = [
              {
                id: 1, // Unique identifier for this category
                index: 50, // Display order (lowest first)
                label: "First Custom",
                icon: "https://cdn.discordapp.com/emojis/1314725686359101532.webp?size=48",
                isCustomIcon: true,
              },
              {
                id: 2, // Unique identifier for this category
                index: 100, // Display order
                label: "Second Custom",
                icon: "https://cdn.discordapp.com/emojis/1384584623497154743.webp?size=48",
                isCustomIcon: true,
              },
              {
                id: 3, // Unique identifier for this category
                index: 200, // Display order (highest last)
                label: "Third Custom",
                icon: "https://cdn.discordapp.com/emojis/1248889599518834779.webp?size=48",
                isCustomIcon: true,
              },
            ];

            return (
              <main className="flex h-full min-h-screen w-full items-center justify-center p-4">
                <EmojiPicker
                  className="h-[342px]"
                  customCategories={customCategories}
                  customEmojis={customEmojis}
                  onEmojiSelect={({ emoji }) => {
                    setIsOpen(false);
                    console.log(emoji);
                  }}
                >
                  <EmojiPickerSearch />
                  <EmojiPickerContent />
                  <EmojiPickerFooter />
                </EmojiPicker>
              </main>
            );
          }
        `}</CodeBlock>
    </figure>
  );
}
