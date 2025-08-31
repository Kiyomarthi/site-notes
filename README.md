# Site Notes — Chrome extension

Lightweight browser extension to keep tasks, notes and file metadata per-site in the popup.

## Features

- Per-site tasks & notes & file metadata
- Persistent storage (chrome.storage.local)
- Copy / Clear / Export features
- Simple UI with hamburger menu and site lists

## Install (developer / local)

1. Clone this repo
2. Open `chrome://extensions/` and enable _Developer mode_
3. Click _Load unpacked_ and select this folder

## Building / Packaging

If you have a build step, run:

```bash
npm install
npm run build
# then create ZIP (manifest.json must be in the zip root)
cd dist && zip -r ../site-notes-v1.0.zip . -x '*.git*'
```
