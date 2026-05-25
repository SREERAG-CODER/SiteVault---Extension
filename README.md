# SiteVault

A file manager for your browser. Organize websites into folders — just like you organize files on your computer.

---

## What is SiteVault?

Chrome's built-in bookmarks are clunky and hard to use. SiteVault replaces them with a proper file manager experience — right inside your browser as a side panel.

Think of it like Windows Explorer or macOS Finder, but for websites.

---

## Features

- **Folders** — create, rename, nest, and delete folders just like your OS
- **Save any site** — save the current tab into any folder in one click
- **Search** — find any saved site instantly
- **Drag and drop** — move sites between folders easily
- **Dark mode** — works with your system theme
- **Right-click menu** — rename, move, delete — just like a real file manager
- **Sessions** — save all open tabs as a folder
- **No login required** — everything saved locally on your machine
- **Import** — bring in your existing Chrome bookmarks

---

## Free vs Pro

| Feature | Free | Pro |
|---|---|---|
| Folders | 3 max | Unlimited |
| Saved sites | 50 max | Unlimited |
| Search | ✅ | ✅ |
| Dark mode | ✅ | ✅ |
| Drag and drop | ✅ | ✅ |
| Grid view + thumbnails | ❌ | ✅ |
| Smart folders | ❌ | ✅ |
| Tags and color labels | ❌ | ✅ |
| Sync across devices | ❌ | ✅ |
| Import / Export | ❌ | ✅ |
| Session saving | ❌ | ✅ |
| Broken link checker | ❌ | ✅ |

Pro plan — **$4/month** or **$29/year**

---

## How Shipping Works (Completely Free)

SiteVault costs nothing to run. Here's the full stack:

| What | Service | Cost |
|---|---|---|
| Extension hosting | Chrome Web Store | $5 one-time |
| Backend / API | Cloudflare Workers | Free |
| Database | Supabase | Free |
| Payments | Lemon Squeezy | Free (% on sales only) |
| Landing page | Cloudflare Pages | Free |
| Email | Resend | Free |
| Code hosting | GitHub | Free |

No monthly server costs. No subscriptions to run it. Only pay when you earn.

---

## Project Structure

```
sitevault/
├── manifest.json       — extension config (Chrome reads this first)
├── background.js       — silent background script
├── sidepanel.html      — the main UI (side panel)
├── sidepanel.js        — side panel logic
├── sidepanel.css       — side panel styles
└── icons/
    ├── icon16.png      — toolbar icon (small)
    ├── icon48.png      — extensions page icon (medium)
    └── icon128.png     — chrome web store icon (large)
```

---

## manifest.json — Explained

```jsonc
{
  // tells chrome which version of the extension standard to use
  // always 3 — never change this
  "manifest_version": 3,

  // the name of your extension
  // shows in chrome web store and chrome://extensions
  "name": "SiteVault",

  // the version of your extension
  // bump this every time you publish an update e.g. 1.0.1, 1.1.0
  "version": "1.0.0",

  // short description shown under your extension name in the chrome web store
  "description": "A file manager for your browser — organize websites into folders, just like your OS.",

  // permissions tell chrome what your extension is allowed to access
  "permissions": [
    "tabs",       // lets you read the current tab's url, title, and favicon
    "storage",    // lets you save folders and sites on the user's machine
    "sidePanel"   // lets you use the side panel api
  ],

  // the toolbar button — the icon users click to open sitevault
  "action": {
    "default_title": "Open SiteVault", // tooltip text when user hovers the icon
    "default_icon": {
      "16": "icons/icon16.png",   // small icon (toolbar)
      "48": "icons/icon48.png",   // medium icon (extensions page)
      "128": "icons/icon128.png"  // large icon (chrome web store)
    }
  },

  // tells chrome which html file to load when the side panel opens
  "side_panel": {
    "default_path": "sidepanel.html"
  },

  // the background script — runs silently with no ui
  // handles opening the side panel when toolbar icon is clicked
  "background": {
    "service_worker": "background.js"
  },

  // extension icons shown on chrome://extensions page and chrome web store
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

> Note — `.jsonc` in the code block above just means JSON with comments, for explanation purposes only.
> Your actual `manifest.json` file must have **no comments** — JSON does not support them.

---

## How to Run Locally

1. Clone or download this repo
2. Open Chrome and go to `chrome://extensions`
3. Turn on **Developer Mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `sitevault` folder
6. Click the extension icon in your toolbar — the side panel opens

---

## Built by

A student who was frustrated with Chrome bookmarks and decided to fix it.