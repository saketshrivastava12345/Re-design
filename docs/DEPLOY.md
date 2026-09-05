# Putting this online

The site is static — HTML, CSS, JS and images, no build step, no server-side
code, no third-party runtime request. Any static host serves it as-is.

Every internal path is relative, so the site works from a subdirectory
(`example.com/Re-design/`) just as well as from a domain root.

## GitHub Pages — fastest, no account needed beyond this repo

1. Open **Settings → Pages** on `saketshrivastava12345/Re-design`.
2. Under *Build and deployment*, set **Source: Deploy from a branch**.
3. Choose branch **`claude/gml-india-scroll-story-2m6ct3`** and folder **`/ (root)`**.
4. Save. The first build takes a minute or two.

The site then lives at:

```
https://saketshrivastava12345.github.io/Re-design/
https://saketshrivastava12345.github.io/Re-design/login.html
https://saketshrivastava12345.github.io/Re-design/register.html
```

`.nojekyll` is committed at the repo root so Pages serves the files verbatim
rather than running them through Jekyll.

The repository is public, so Pages is free here — no plan needed. The ~30 MB of
frames sits comfortably inside the 1 GB Pages limit.

## Netlify / Vercel / Cloudflare Pages

Connect the repo, pick this branch, and leave the build settings empty:

- Build command: *(none)*
- Publish / output directory: `.`

## Any static server

```bash
python -m http.server 8848     # or: npx serve, php -S localhost:8848
```

Or upload the repo contents to S3 + CloudFront, nginx, or any bucket. Serve it
over HTTP, not `file://` — the frame sequence is fetched with image loads and
needs an HTTP origin.

## Before it goes in front of the client

- Drop the official logo in at `assets/brand/gml-logo.svg` — see
  [`ASSETS.md`](../ASSETS.md).
- Re-verify the register figures against the live site (`docs/CONTENT-MAP.md`).
- Set the integration points in `assets/js/main.js` and `assets/js/auth.js` if a
  tracking API, quote endpoint or authentication service is available.
