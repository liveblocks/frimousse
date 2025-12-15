"use client";

import {
  EmojiPicker as EmojiPickerPrimitive,
  type EmojiPickerRootProps,
} from "frimousse";
import { ExamplePreview } from "@/examples/example-preview";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

function EmojiPicker({ className, columns, ...props }: EmojiPickerRootProps) {
  return (
    <EmojiPickerPrimitive.Root
      className={cn(
        "elevation relative isolate flex h-[368px] w-fit flex-col overflow-hidden rounded-xl bg-white shadow-elevation after:pointer-events-none after:absolute after:inset-0 after:z-10 after:rounded-[inherit] dark:bg-neutral-900 dark:after:shadow-[inset_0_0_0_1px_var(--color-neutral-800)]",
        className,
      )}
      columns={columns}
      {...props}
    >
      <EmojiPickerPrimitive.Search className="focusable z-10 mx-2 mt-2 appearance-none rounded-md bg-neutral-100 px-2.5 py-2 text-sm dark:bg-neutral-800" />
      <EmojiPickerPrimitive.CategoryNav>
        {({ categories }) => (
          <div className="mx-2 mt-2 px-1 flex gap-2 overflow-x-auto max-w-[38ch] text-xs">
            {categories.map(({ category, scrollTo }) => (
              <button key={category.label} type="button" onClick={scrollTo} className="bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 hover:dark:bg-neutral-700 px-2 rounded-sm flex items-center leading-6 text-nowrap">
                {category.label}
              </button>
            ))}
          </div>
        )}
      </EmojiPickerPrimitive.CategoryNav>
      <EmojiPickerPrimitive.Viewport className="scrollbar-track-[transparent] scrollbar-thumb-neutral-500/30 dark:scrollbar-thumb-neutral-400/30 relative flex-1 outline-hidden">
        <EmojiPickerPrimitive.Loading className="absolute inset-0 flex items-center justify-center text-neutral-400 text-sm dark:text-neutral-500">
          Loading…
        </EmojiPickerPrimitive.Loading>
        <EmojiPickerPrimitive.Empty className="absolute inset-0 flex items-center justify-center text-neutral-400 text-sm dark:text-neutral-500">
          No emoji found.
        </EmojiPickerPrimitive.Empty>
        <EmojiPickerPrimitive.List
          className="select-none pb-1.5"
          components={{
            Emoji: ({ emoji, ...props }) => (
              <button
                className="flex size-8 items-center justify-center whitespace-nowrap rounded-md text-lg data-[active]:bg-neutral-100 dark:data-[active]:bg-neutral-800"
                {...props}
              >
                {emoji.emoji}
              </button>
            ),
            Row: ({ children, ...props }) => (
              <div className="scroll-my-1.5 px-1.5" {...props}>
                {children}
              </div>
            ),
            CategoryHeader: ({ category, ...props }) => (
              <div
                className="after:-top-1 relative bg-white px-3 pt-3 pb-1.5 font-medium text-neutral-600 text-xs after:absolute after:inset-x-0 after:h-2 after:bg-white dark:bg-neutral-900 dark:text-neutral-400 dark:after:bg-neutral-900"
                {...props}
              >
                {category.label}
              </div>
            ),
          }}
        />
      </EmojiPickerPrimitive.Viewport>
    </EmojiPickerPrimitive.Root>
  );
}

export function UsagePreview() {
  return (
    <ExamplePreview className="h-[480px]">
      <EmojiPicker
        onEmojiSelect={(emoji) => {
          toast(emoji);
        }}
      />
    </ExamplePreview>
  );
}
