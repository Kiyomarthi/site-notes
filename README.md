# Site Notes Extension

A lightweight Chrome extension to manage **tasks, notes, and files per website**.  
All your data is stored locally in Chrome storage, scoped by domain.

## Features

- ✅ Add tasks (with check, copy, delete)
- ✅ Add notes (auto-save, copy, clear)
- ✅ Upload files (list, delete)
- ✅ Keep everything per-site (each domain has its own notes & tasks)
- ✅ View and switch between all saved sites
- ✅ Modern hamburger menu with animations
- ✅ Minimal memory usage (no background polling)

## Screenshots

_(Add some screenshots here if you want)_

## Installation

1. Clone or download this repository.
2. Open **Chrome** and go to `chrome://extensions/`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select this folder.
5. The extension will now appear in your toolbar.

## Packaging for Release

If you want to distribute:

```bash
zip -r site-notes-v1.0.zip . -x '*.git*'
```
