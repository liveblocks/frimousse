<h1>
  <a href="https://frimousse.liveblocks.io#gh-light-mode-only">
    <img src=".github/assets/logo-light.svg" width="107" height="24" alt="Frimousse" align="center" />
  </a>
  <a href="https://frimousse.liveblocks.io#gh-dark-mode-only">
    <img src=".github/assets/logo-dark.svg" width="107" height="24" alt="Frimousse" align="center" />
  </a>
</h1>

[![npm](https://img.shields.io/npm/v/frimousse?labelColor=651&color=fc0)](https://www.npmjs.com/package/frimousse)
[![downloads](https://img.shields.io/npm/dm/frimousse?label=downloads&labelColor=651&color=fc0)](https://www.npmjs.com/package/frimousse)
[![size](https://img.shields.io/bundlephobia/minzip/frimousse?label=size&labelColor=651&color=fc0)](https://bundlephobia.com/package/frimousse)
[![tests](https://img.shields.io/github/actions/workflow/status/liveblocks/frimousse/.github/workflows/tests.yml?label=tests&labelColor=651&color=fc0)](https://github.com/liveblocks/frimousse/actions/workflows/tests.yml)
[![license](https://img.shields.io/github/license/liveblocks/frimousse?labelColor=651&color=fc0)](https://github.com/liveblocks/frimousse/blob/main/LICENSE)

A lightweight, unstyled, and composable emoji picker for React.

- ⚡️ **Lightweight and fast**: Dependency-free, tree-shakable, and virtualized with minimal re-renders
- 🎨 **Unstyled and composable**: Bring your own styles and compose parts as you want
- 🔄 **Always up-to-date**: Latest emoji data is fetched when needed and cached locally
- 🔣 **No � symbols**: Unsupported emojis are automatically hidden
- ♿️ **Accessible**: Keyboard navigable and screen reader-friendly

 <img src=".github/assets/header.svg" alt="Various emoji pickers." />

## Installation

```bash
npm i frimousse
```

If you are using [shadcn/ui](https://ui.shadcn.com/), you can also install it as a pre-built component via the [shadcn CLI](https://ui.shadcn.com/docs/cli).

```bash
npx shadcn@latest add https://frimousse.liveblocks.io/r/emoji-picker
```

Learn more in the [shadcn/ui](#shadcnui) section.

## Usage

Import the `EmojiPicker` parts and create your own component by composing them.

```tsx
import { EmojiPicker } from "frimousse";

export function MyEmojiPicker() {
  return (
    <EmojiPicker.Root>
      <EmojiPicker.Search />
      <EmojiPicker.Viewport>
        <EmojiPicker.Loading>Loading…</EmojiPicker.Loading>
        <EmojiPicker.Empty>No emoji found.</EmojiPicker.Empty>
        <EmojiPicker.List />
      </EmojiPicker.Viewport>
    </EmojiPicker.Root>
  );
}
```

Apart from a few sizing and overflow defaults, the parts don’t have any styles out-of-the-box. Being composable, you can bring your own styles and apply them however you want: [Tailwind CSS](https://tailwindcss.com/), CSS-in-JS, vanilla CSS via inline styles, classes, or by targeting the `[frimousse-*]` attributes present on each part.

You might want to use it in a popover rather than on its own. Frimousse only provides the emoji picker itself so if you don’t have a popover component in your app yet, there are several libraries available: [Radix UI](https://www.radix-ui.com/primitives/docs/components/popover), [Base UI](https://base-ui.com/react/components/popover), [Headless UI](https://headlessui.com/react/popover), and [React Aria](https://react-spectrum.adobe.com/react-aria/Popover.html), to name a few.

### shadcn/ui

If you are using [shadcn/ui](https://ui.shadcn.com/), you can install a pre-built version which integrates with the existing shadcn/ui variables via the [shadcn CLI](https://ui.shadcn.com/docs/cli).

```bash
npx shadcn@latest add https://frimousse.liveblocks.io/r/emoji-picker
```

It can be composed and combined with other shadcn/ui components like [Popover](https://ui.shadcn.com/docs/components/popover).

## Documentation

Find the full documentation and examples on [frimousse.liveblocks.io](https://frimousse.liveblocks.io).

## Compatibility

- React 18 and 19
- TypeScript 5.1 and above

## Miscellaneous

The name [“frimousse”](https://en.wiktionary.org/wiki/frimousse) means “little face” in French, and it can also refer to smileys and emoticons.

The emoji picker component was originally created for the [Liveblocks Comments](https://liveblocks.io/comments) default components, within [`@liveblocks/react-ui`](https://github.com/liveblocks/liveblocks/tree/main/packages/liveblocks-react-ui).

## Credits

The emoji data is based on [Emojibase](https://emojibase.dev/).

## Contributing

All contributions are welcome! If you find a bug or have a feature request, feel free to create an [issue](https://github.com/liveblocks/frimousse/issues) or a [PR](https://github.com/liveblocks/frimousse/pulls).

The project is setup as a monorepo with the `frimousse` package at the root and [frimousse.liveblocks.io](https://frimousse.liveblocks.io) in the `site` directory.

### Development

Install dependencies and start development builds from the root.

```bash
npm i
npm run dev
```

The site can be used as a development playground since it’s built with the root package via [Turborepo](https://turbo.build/repo).

```bash
npm run dev:site
```

### Tests

The package has 95%+ test coverage with [Vitest](https://vitest.dev/). Some tests use Vitest’s [browser mode](https://vitest.dev/guide/browser-testing) with [Playwright](https://playwright.dev/), make sure to install the required browser first.

```bash
npx playwright install chromium
```

Run the tests.

```bash
npm run test:coverage
```

### Releases

Releases are triggered from [a GitHub action](.github/workflows/release.yml) via [release-it](https://github.com/release-it/release-it), and continuous releases are automatically triggered for every commit in PRs via [pkg.pr.new](https://github.com/stackblitz-labs/pkg.pr.new).
