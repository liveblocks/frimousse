## [Unreleased]

## [0.4.0] - 2026-09-21

- Add `resolveEmojiData` prop on `EmojiPicker.Root` and export `defaultEmojiDataResolver` to support custom data sources and locales.
- Add `createEmojiDataCache` to persist custom emoji data in `localStorage`.
- Add `getEmojiDetails` and `useEmojiDetails` to retrieve details from an emoji.
- Fix cached emoji data only being checked for updates for the first locale used.
- Fix cached data ignoring changes to `emojibaseUrl` and `emojiVersion`.

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
