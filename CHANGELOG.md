## [Unreleased]

- Add `sticky` prop on `EmojiPicker.Root` to allow disabling sticky category headers, thanks @Earthsplit!
- Fix return types to support TypeScript versions lower than 5.1.

## [0.2.0] - 2025-04-02

- When setting `emojiVersion` on `EmojiPicker.Root`, this version of Emojibase’s data will be fetched instead of `latest`.
- Add `emojibaseUrl` prop on `EmojiPicker.Root` to allow choosing where Emojibase’s data is fetched from: another CDN, self-hosted files, etc.

## [0.1.1] - 2025-03-31

- Fix `EmojiPicker.Search` controlled value not updating search results when updated externally. (e.g. other input, manually, etc)

## [0.1.0] - 2025-03-18

- Initial release.
