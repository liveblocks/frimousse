"use client";

import type { Emoji } from "frimousse";
import { toast } from "@/lib/toast";
import { ExamplePreview } from "../example-preview";
import {
  EmojiPicker,
  EmojiPickerContent,
  EmojiPickerFooter,
  EmojiPickerSearch,
} from "./ui/emoji-picker";

export function ShadcnUiCustomEmojisPreview() {
  const customEmojis: Emoji[] = [];

  for (let i = 0; i < 15; i++) {
    customEmojis.push({
      emoji:
        "https://cdn.discordapp.com/emojis/1314725686359101532.webp?size=48&test=" +
        i,
      label: "GWAAA" + i,
      tags: ["gwaaa" + i],
      isCustom: true,
      category: 1,
    });
    customEmojis.push({
      emoji:
        "https://cdn.discordapp.com/emojis/1384584623497154743.webp?size=48&test=" +
        i,
      label: "Oopsie" + i,
      tags: ["oopsie" + i],
      isCustom: true,
      category: 2,
    });
    customEmojis.push({
      emoji:
        "https://cdn.discordapp.com/emojis/1248889599518834779.webp?size=48&test=" +
        i,
      label: "sunfire" + i,
      tags: ["sunfire" + i],
      isCustom: true,
      category: 3,
    });
  }

  const customCategories = [
    {
      id: 1,
      index: 50,
      label: "First Custom",
      icon: "https://cdn.discordapp.com/emojis/1314725686359101532.webp?size=48",
      isCustomIcon: true,
    },
    {
      id: 2,
      index: 100,
      label: "Second Custom",
      icon: "https://cdn.discordapp.com/emojis/1384584623497154743.webp?size=48",
      isCustomIcon: true,
    },
    {
      id: 3,
      index: 200,
      label: "Third Custom",
      icon: "https://cdn.discordapp.com/emojis/1248889599518834779.webp?size=48",
      isCustomIcon: true,
    },
  ];

  return (
    <ExamplePreview className="not-base shadcnui h-[446px]">
      <EmojiPicker
        className="h-[342px]"
        customCategories={customCategories}
        customEmojis={customEmojis}
        onEmojiSelect={(emoji: any) => {
          toast(emoji);
        }}
      >
        <EmojiPickerSearch />
        <EmojiPickerContent />
        <EmojiPickerFooter />
      </EmojiPicker>
    </ExamplePreview>
  );
}
