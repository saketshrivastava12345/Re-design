# Putting this online

The site is static — HTML, CSS, JS and images, no build step, no server-side
code, no third-party runtime request. Any static host serves it as-is.

Every internal path is relative, so the site works from a subdirectory
(`example.com/Re-design/`) just as well as from a domain root.

## GitHub Pages

A workflow is already committed at `.github/workflows/pages.yml`. It assembles
the site and deploys it, and it runs on every push to
`claude/gml-india-scroll-story-2m6ct3`.

**One setting has to be changed by hand first.** The workflow's `GITHUB_TOKEN`
is not allowed to turn Pages on for a repository — GitHub answers
`Create Pages site failed: Resource not accessible by integration` — so the
first deploy needs a repository admin:

1. Open **Settings → Pages** on `saketshrivastava12345/Re-design`.
2. Under *Build and deployment*, set **Source: GitHub Actions**.
3. Go to **Actions → Deploy to GitHub Pages → Run workflow**, and pick the
   branch `claude/gml-india-scroll-story-2m6ct3`.

From then on every push to that branch republishes automatically.

The site will be at:

```
https://saketshrivastava12345.github.io/Re-design/
https://saketshrivastava12345.github.io/Re-design/login.html
https://saketshrivastava12345.github.io/Re-design/register.html
```

The repository is public, so Pages is free here — no plan needed. The published
tree is 32 MB, comfortably inside the 1 GB Pages limit.

<details>
<summary>If you would rather not use the workflow</summary>

Set **Source: Deploy from a branch**, branch
`claude/gml-india-scroll-story-2m6ct3`, folder `/ (root)`. `.nojekyll` is
committed at the repo root so Pages serves the files verbatim instead of running
them through Jekyll. Delete `.github/workflows/pages.yml` if you take this
route, so the two do not both try to publish.

</details>

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

## Higgsfield (already deployed, currently sign-in gated)

A copy is live on Higgsfield's hosting at
**<https://gml-india-logistics.higgsfield.app>** — but the platform gates a site
that has not been listed on its community feed, so the URL answers
`401 unauthenticated` to anyone not signed in as the owner. It is reviewable by
the account that deployed it and **cannot be shared with a client as it stands**.

Opening it to the public means listing GML's site on Higgsfield's public
AI-creative community feed, which is a brand decision and was deliberately not
taken. GitHub Pages above is the better route for a client-facing link.

That deployment differs from this repository in exactly one way: to keep the
bundle small it does **not** carry the 480 journey frames, and sets

```html
<script>window.GML_FRAME_BASE = "https://cdn.jsdelivr.net/gh/<owner>/<repo>@<sha>/assets/frames/";</script>
```

so the frames stream from a CDN, pinned to an immutable commit. That hook is a
supported option (see `assets/js/journey.js`) and is **off by default** — a
checkout of this repository is entirely self-contained and serves its own
frames. Note that the CDN path depends on this GitHub repository staying public.
