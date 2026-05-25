# SiteVault

A file manager for your browser. Organize websites into folders — just like you organize files on your computer.

> Built by a student who was frustrated with Chrome bookmarks and decided to fix it.

---

## What is SiteVault?

Chrome's built-in bookmarks are clunky, hard to use, and haven't changed in years. SiteVault replaces them with a proper file manager experience — injected directly into every webpage as a floating side panel.

Think of it like Windows Explorer or macOS Finder, but for websites. A small tab sits on the left edge of every page. Hover over it — it slides into view. Click it — your full file manager opens.

---

## How It Works

```
Every webpage you visit:

← tiny tab hidden on left edge
   ↓ hover
← tab slides into view
   ↓ click
← full panel slides in from left (1/3 of screen)
   → organize, save, search your sites
   ↓ click outside
← panel slides away
```

No separate app. No new tab needed. Lives inside every website you visit.

---

## Current Features (v1.0.0)

- Floating tab on left edge of every webpage — hidden until hovered
- Side panel slides in smoothly from the left
- Dark translucent panel with frosted glass effect
- Click outside (overlay) to close panel
- Settings popup via toolbar icon

---

## Planned Features

### Core File Manager (v1.1)
- Create, rename, delete, and nest folders
- Save current tab into any folder in one click
- Click any saved site to open it
- Drag and drop sites between folders
- Right-click context menu — rename, move, delete, open
- Undo / Redo for any action

### Search (v1.2)
- Instant fuzzy search across all saved sites
- Search by title, URL, tag, or folder name
- Keyboard shortcut to focus search

### New Tab Page (v1.2)
- Replace Chrome's default new tab with SiteVault
- Quick access folders front and center
- Recently saved sites
- Search bar built in

### Settings (v1.2)
- Dark mode toggle
- Panel size — Small (25%), Medium (33%), Large (50%)
- Accent color picker
- Panel position — left or right

### Views (v1.3)
- List view (default)
- Grid view with site thumbnails
- Compact view for power users

### Tags and Labels (v1.3)
- Add tags to any saved site
- Color labels — like Finder
- Filter by tag or label

### Sessions (v1.4)
- Save all open tabs as a named session/folder
- Restore a session with one click

### Import / Export (v1.4)
- Import existing Chrome bookmarks
- Export to HTML, JSON, or CSV
- Import from Pocket, Raindrop, Pinboard

### Smart Folders (v1.5 — Pro)
- Auto-populate based on rules
- Examples — "all sites visited this week", "all YouTube links", "all unread"

### Sync (v1.5 — Pro)
- Sync folders and sites across all devices
- Powered by Supabase backend

### Broken Link Checker (v1.6 — Pro)
- Scan all saved sites and flag dead links
- One-click cleanup

---

## Free vs Pro

| Feature | Free | Pro |
|---|---|---|
| Folders | 3 max | Unlimited |
| Saved sites | 50 max | Unlimited |
| Search | ✅ | ✅ |
| Dark mode | ✅ | ✅ |
| Drag and drop | ✅ | ✅ |
| New tab page | ✅ | ✅ |
| Import Chrome bookmarks | ✅ | ✅ |
| Grid view + thumbnails | ❌ | ✅ |
| Smart folders | ❌ | ✅ |
| Tags and color labels | ❌ | ✅ |
| Sync across devices | ❌ | ✅ |
| Export (JSON, CSV, HTML) | ❌ | ✅ |
| Session saving | ❌ | ✅ |
| Broken link checker | ❌ | ✅ |
| Priority support | ❌ | ✅ |

**Pro plan — $4/month or $29/year**

---

## Browser Support

| Browser | Support |
|---|---|
| Chrome | ✅ Full |
| Edge | ✅ Full (Chromium based) |
| Brave | ✅ Full (Chromium based) |
| Opera | ✅ Full (Chromium based) |
| Firefox | 🔜 Planned |
| Safari | 🔜 Planned |

One Chrome Web Store listing works across Chrome, Edge, Brave, and Opera automatically.

---

## Tech Stack (100% Free to Run)

| What | Service | Cost |
|---|---|---|
| Extension hosting | Chrome Web Store | $5 one-time |
| Backend / license verification | Cloudflare Workers | Free |
| Database | Supabase | Free |
| Payments | Lemon Squeezy | Free (% on sales only) |
| Landing page | Cloudflare Pages | Free |
| Transactional email | Resend | Free |
| Code hosting | GitHub | Free |
| Analytics | Umami | Free |

**Total fixed cost — $5 to start. $9/year after that (optional domain).**

Everything else only costs money when you're already earning money.

---

## How Storage Works

| Data | Where stored |
|---|---|
| Settings (dark mode, size, color) | `chrome.storage.sync` — syncs automatically |
| Folders and sites (free users) | `chrome.storage.local` — stays on device |
| Folders and sites (pro users) | Supabase — syncs across all devices |

No login required for free users. Everything works locally out of the box.

---

## License Verification Flow (Pro)

```
User pays on landing page
        ↓
Lemon Squeezy processes payment
        ↓
License key sent to user via email (Resend)
        ↓
User enters key in SiteVault settings
        ↓
Extension hits Cloudflare Worker to verify key
        ↓
Worker checks Supabase database
        ↓
Pro features unlock instantly
```

---

## Project Structure

```
sitevault/
├── manifest.json       — extension config (Chrome reads this first)
├── background.js       — silent background script (future: shortcuts, context menus)
├── content.js          — injects floating tab + panel into every webpage
├── content.css         — styles for the floating tab + panel
├── popup.html          — settings UI (opens when toolbar icon is clicked)
├── popup.css           — settings styles
├── popup.js            — settings logic (dark mode, panel size, accent color)
├── newtab.html         — custom new tab page (planned v1.2)
└── icons/
    ├── icon16.png      — toolbar icon (16x16)
    ├── icon48.png      — extensions page icon (48x48)
    └── icon128.png     — chrome web store icon (128x128)
```

---

## manifest.json — Explained

```jsonc
{
  // tells chrome which version of the extension standard to use
  // always 3 — never change this
  "manifest_version": 3,

  // the name shown in chrome web store and chrome://extensions
  "name": "SiteVault",

  // bump this every time you publish an update e.g. 1.0.1, 1.1.0
  "version": "1.0.0",

  // short description shown in chrome web store
  "description": "A file manager for your browser — organize websites into folders, just like your OS.",

  // what your extension is allowed to access
  "permissions": [
    "tabs",     // read current tab url, title, favicon when saving a site
    "storage"   // save folders and sites on the user's machine
  ],

  // toolbar button — opens settings popup when clicked
  "action": {
    "default_title": "SiteVault Settings",
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },

  // silent background script — will handle shortcuts, context menus later
  "background": {
    "service_worker": "background.js"
  },

  // extension icons for chrome://extensions and chrome web store
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },

  // injects content.js and content.css into every website the user visits
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "css": ["content.css"]
    }
  ]
}
```

> Note — `.jsonc` means JSON with comments, for explanation only.
> Your actual `manifest.json` must have no comments — JSON does not support them.

---

## How to Run Locally

1. Clone or download this repo
2. Open Chrome and go to `chrome://extensions`
3. Turn on **Developer Mode** (top right toggle)
4. Click **Load unpacked**
5. Select the `sitevault` folder
6. Go to any website — hover the left edge to see the tab

---

## Marketing Plan

### Phase 1 — Before Launch (While Building)
- Create a Twitter/X account and post progress every few days
- Screenshot every milestone — panel opening, folders working, drag and drop
- Set up a simple waitlist (Google Form or Tally.so)
- Build in public — people follow journeys

### Phase 2 — Launch Week

Post across all channels in the same week:

**Reddit** — write genuine posts in:
- r/SideProject
- r/productivity
- r/chrome
- r/webdev
- r/opensource

**Hacker News** — post a Show HN:
> "Show HN: I built a file manager for browser bookmarks"

**Product Hunt** — biggest lever:
- Launch Tuesday, Wednesday, or Thursday
- Post at 12:01 AM PST
- Push hard in first 2 hours — ask friends, family, followers to upvote
- Write a genuine maker story — "I'm a student, I built this, here's why"

### Phase 3 — After Launch
- Reply to every single user, review, and comment
- Fix bugs fast and post about it publicly
- Ask early users for Chrome Web Store reviews
- Write one SEO blog post — "Why Chrome bookmarks are broken"
- Find small productivity YouTubers (5k–50k subs) and offer free Pro access

### Phase 4 — Turn On Pro (Month 3)
- Email all users with a genuine note
- Offer 30 days free Pro to early adopters as a thank you
- Post the milestone publicly — "SiteVault Pro is live"

### Key Marketing Advantage

Being a student is a story people root for. Use it everywhere:
> "I'm a student with no budget who built this because I couldn't afford Raindrop Pro"

Post this on LinkedIn, Reddit, Twitter. It gets traction.

---

## Competitor Analysis

| Product | Price | Problem |
|---|---|---|
| Raindrop.io | $3/month | Web app, not native in browser |
| Toby | $5/month | Complicated, poor rating (3.3/5) |
| Pocket | Shutting down July 2025 | 2M displaced users looking for alternative |
| Chrome Bookmarks | Free | Clunky, unchanged since 2009 |

**SiteVault positioning:**
> "The bookmark manager that actually feels good to use — lives right in your browser, no separate app needed."

---

## Realistic Revenue Projection

| Timeline | Installs | Paying Users | Monthly Revenue |
|---|---|---|---|
| Month 1 (launch) | 200–500 | 0 | $0 |
| Month 2 (Pro live) | 500–1000 | 10–25 | $40–100 |
| Month 3–6 | 1000–3000 | 50–100 | $200–400 |
| Month 6–12 | 3000–8000 | 150–300 | $600–1200 |

At Month 6–12: **₹50,000–₹1,00,000/month** as a student in India.

---

## Submission Directories

Submit to all of these on launch day:
- Chrome Web Store
- AlternativeTo.net (list as alternative to Raindrop, Pocket, Toby)
- Product Hunt (permanent listing beyond launch day)
- Indie Hackers
- extensionlist.com
- chrome-stats.com

---


