# Brand assets — drop-in slots

The build environment for this redesign had **no outbound network access to
`gmlindia.net`** (the egress proxy refused the connection), so no artwork could
be downloaded from the live site. Rather than substitute stock imagery or fake
marks, the page is built so that the official files slot straight in.

Nothing here is a placeholder graphic: every slot either renders a real drawn
mark or renders nothing at all.

## `gml-logo.svg` — the logo

Used by the header and the footer via `<img class="brand__img" data-brand-logo>`.

**To use the official logo: replace this one file.** Every place the logo
appears updates at once. The `<img>` is sized `height: 38px; width: auto`; if
the official lockup has a very different ratio, set an explicit width on
`.brand__img` in `assets/css/main.css`.

If the file is ever missing or fails to load, `assets/js/main.js` leaves the
inline meridian mark and wordmark in the markup visible instead, so the header
never collapses.

## `certs/` — certification and membership marks

Empty by design. `assets/js/main.js` only requests these files when
`GML_CONFIG.certLogos` is set to `true`, so the page never fires a request for
artwork that is not there, and the certifications section is set typographically
from the register itself (with the real registration numbers) until the marks
arrive.

To switch the marks on:

1. Drop the official SVGs into this folder using the slugs already declared in
   `index.html` as `data-logo="…"`:

   ```
   dgs  fmc  iso9001  aeo  ctpat  nhavasheva  mbpt  iata  msme
   cai  fffai  fiata  northstar  opca  uconnect  tcda  wca
   ```

2. Set `certLogos: true` in `GML_CONFIG` at the top of `assets/js/main.js`.

Only add a mark the company is genuinely entitled to display.

## Photography

Every photograph on the site is derived from the supplied 240-frame journey
sequence — see `tools/build_stills.py`. No stock photography is used anywhere.
If official GML photography becomes available, the files in `assets/img/` are
the ones to replace; each is referenced by name in `index.html`.
