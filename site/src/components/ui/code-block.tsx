"use cache";

import {
  transformerNotationDiff,
  transformerNotationErrorLevel,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import dedent from "dedent";
import type { ComponentProps } from "react";
import type { BundledLanguage } from "shiki";
import { codeToHtml } from "shiki";
import { cn } from "@/lib/utils";
import { CopyButton } from "../copy-button";

const TRANSFORMERS_ANNOTATION_REGEX = /\[!code(?:\s+\w+(:\w+)?)?\]/;

interface CodeBlockProps extends Omit<ComponentProps<"div">, "children"> {
  lang: BundledLanguage;
  children: string;
}

function removeTransformersAnnotations(code: string): string {
  return code
    .split("\n")
    .filter((line) => !TRANSFORMERS_ANNOTATION_REGEX.test(line))
    .join("\n");
}

export async function CodeBlock({
  children,
  lang,
  className,
  ...props
}: CodeBlockProps) {
  const code = dedent(children);
  const html = await codeToHtml(code, {
    lang,
    themes: {
      light: "github-light",
      dark: "github-dark",
    },
    defaultColor: false,
    transformers: [
      transformerNotationDiff(),
      transformerNotationErrorLevel(),
      transformerNotationHighlight(),
      transformerNotationWordHighlight(),
    ],
  });

  return (
    <div
      className={cn(
        "code-block not-prose group relative isolate flex min-h-11 flex-col overflow-hidden rounded-lg bg-muted",
        className,
      )}
      {...props}
    >
      <CopyButton
        className={cn(
          "absolute top-1.5 right-1.5 z-10 bg-muted/20 outline-muted-foreground/40 backdrop-blur-md",
          "lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100",
        )}
        text={removeTransformersAnnotations(code)}
      />
      <div
        className={cn(
          "scrollbar-track-[transparent] scrollbar-thumb-secondary-foreground/30 flex flex-1 overflow-auto text-secondary-foreground text-sm",
          "**:[code:has(.line:only-child)]:h-full **:[code:has(.line:only-child)]:pt-3.25 **:[code:has(.line:only-child)]:pb-3 **:[code]:table **:[code]:py-3.5 **:[pre,code,.line]:w-full **:[pre,code]:font-mono **:[pre,span]:text-(--shiki-light) dark:**:[pre,span]:text-(--shiki-dark) **:[pre]:cursor-text **:[pre]:outline-none",
          "**:[.line:empty]:before:content-['_'] **:[.line]:table-row **:[.line_:first-child]:ml-4 **:[.line_:last-child]:mr-12 lg:**:[.line_:last-child]:mr-4",
          "**:[.line.highlighted]:bg-secondary/60 dark:**:[.line.highlighted]:bg-secondary/80",
          "**:[.line.diff.add]:bg-lime-500/15 dark:**:[.line.diff.add]:bg-lime-400/10",
          "**:[.line.diff.remove]:bg-rose-500/20 **:[.line.diff.remove]:opacity-50 dark:**:[.line.diff.remove]:bg-rose-400/20",
          "**:[.highlighted-word]:before:-z-1 **:[.highlighted-word]:pointer-events-none **:[.highlighted-word]:relative **:[.highlighted-word]:before:absolute **:[.highlighted-word]:before:inset-x-[-0.25em] **:[.highlighted-word]:before:inset-y-[-0.165em] **:[.highlighted-word]:before:rounded-sm **:[.highlighted-word]:before:bg-secondary/80 dark:**:[.highlighted-word]:before:bg-secondary",
        )}
        // biome-ignore lint/security/noDangerouslySetInnerHtml: This is safe with Shiki
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
