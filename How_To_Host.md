# How to Host - TOTEM Landing Page

## Overview

This is a **static site** — no bundling, build step, or package manager required. The files are ready to deploy as-is.

---

## Quick Start (2 Steps)

### 1. Rename the HTML Entry Point

Rename `TOTEM Landing.dc.html` → **`index.html`**

- Ensures the server auto-loads it at the root URL.
- Eliminates the space in the filename, which causes issues in URLs.
- All paths in the project are relative — **nothing breaks**.

### 2. Upload to Your Host

Copy the following to your hosting provider:

```
index.html
support.js
assets/
```

> ⚠️ **Skip the `uploads/` folder** — it contains only temporary uploaded files. Everything actually used has already been copied into `assets/`.

---

## Hosting Options

Any static hosting provider works. Pick one:

| Provider | How |
|---|---|
| **Netlify** | Drag & drop the folder into their browser UI (easiest) |
| **GitHub Pages** | Push from VS Code, then enable Pages in repo settings |
| **Vercel** | Connect your repo or drag & drop |
| **Cloudflare Pages** | Connect repo or upload via Wrangler |
| **Shared Hosting** | Upload via FTP |

No Node.js, npm, or compilation needed — the page opens directly in a browser.

---

## ⚠️ Note on Fonts

Fonts (`Unbounded`, `Space Grotesk`) are loaded from **Google Fonts**. The site requires an internet connection to load them — this is not an issue on hosted deployments.
