## [Unreleased]

- Add `resolveEmojiData` prop on `EmojiPicker.Root` to control how emoji data is resolved, with a `(locale, { emojiVersion, emojibaseUrl, signal }) => EmojiData | Promise<EmojiData>` function. It defaults to `defaultEmojiDataResolver`, now exported, which fetches Emojibase data as before—so custom resolvers can handle the locales they know about (including ones not supported by Emojibase) and delegate the rest to it.
- Add `createEmojiDataCache` to persist emoji data in `localStorage` across page loads, the same cache used by `defaultEmojiDataResolver`.
- Fix `sessionStorage` revalidation being skipped for every locale after the first one was fetched.

## [0.3.0] - 2025-07-15

- Add `sticky` prop on `EmojiPicker.Root` to allow disabling sticky category headers, thanks @Earthsplit!
- Add TypeScript as an optional peer dependency to prevent using TypeScript versions lower than 5.1.

## [0.2.0] - 2025-04-02

- When setting `emojiVersion` on `EmojiPicker.Root`, this version of Emojibase’s data will be fetched instead of `latest`.
- Add `emojibaseUrl` prop on `EmojiPicker.Root` to allow choosing where Emojibase’s data is fetched from: another CDN, self-hosted files, etc.

## [0.1.1] - 2025-03-31

- Fix `EmojiPicker.Search` controlled value not updating search results when updated externally. (e.g. other input, manually, etc)

## [0.1.0] - 2025-03-18

- Initial release.
