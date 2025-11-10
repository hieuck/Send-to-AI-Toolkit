# Send-to-AI

Send-to-AI is a Chrome extension that lets you quickly send selected text or links from any webpage to a variety of AI platforms for actions like answering, rewriting, or translating.

## Features

- Right-click (context menu) entry: "Send to AI" when you select text or right-click a link.
- Choose target platform, action (Answer/Rewrite/Translate), and prompt template (Quick/Short/Detailed/Custom).
- Options page to set default translation language, add custom platform endpoints, and manage prompt templates.
- Background service worker assembles prompts and opens the selected platform with the prompt (attempts auto-fill when possible).
- Content script injected into common AI domains to allow auto-population of inputs.
- Localization ready (English and Vietnamese provided).

## Installation (developer / unpacked)

1. Download or clone this repository.
2. Open Chrome, go to `chrome://extensions/`.
3. Enable "Developer mode" (top-right).
4. Click "Load unpacked" and select the `send-to-ai` folder.

## Usage

1. Select text on any webpage (or right-click a link).
2. Right-click and choose "Send to AI" → pick a platform → pick an action → pick a prompt template.
3. A new tab will open to the platform. If the platform supports prefilled prompt URLs the prompt will be passed via the URL (best-effort). Otherwise the extension will try to auto-insert the prompt into common input areas.
4. For custom prompt templates, open the extension options and add/edit templates.

## Options

Open the extension popup and click "Open settings" or go to `chrome://extensions/` and choose "Details" → "Extension options".

- Default translation language — used for translate templates.
- Platforms — add custom platform entries with key, name, and base URL.
- Templates — add, edit or delete templates per action (answer, rewrite, translate).

## Limitations & Known Issues

- Many AI web UIs do not accept a prompt directly via URL; filling the prompt may rely on DOM structure which can change. The extension does a best-effort injection but may not work on all platforms.
- Host permissions are wide (`<all_urls>`) to allow injection where needed. You can edit `manifest.json` to limit host permissions.
- Some sites block script injection; in that case automatic filling may fail and you will need to paste the prompt manually.

## Roadmap / Bonus ideas

- OCR and image text extraction
- Voice input/output
- Import/export settings and sync across devices
- Better platform-specific filling logic and official APIs where available

## Developer notes
- Background is a Manifest V3 service worker (module). Context menus are rebuilt from storage and defaults.
- Templates are simple mustache-like keys ({{selectedText}}, {{url}}, {{targetLang}}).

## Contributing

PRs are welcome. Keep modular code changes and add tests for parsing/templating where applicable.

---
Made with care. If you want additional platforms or native API integrations, open an issue describing the target API and auth requirements.
