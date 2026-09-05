# Asset status — read before presenting this to the client

Everything on the page is either a real asset or a documented drop-in slot.
Nothing is stock photography, nothing is a placeholder graphic, and nothing
imitates a GML mark.

## What could not be fetched, and why

The build environment for this redesign had **no outbound network route to
`gmlindia.net`** — the egress proxy refused the connection (`403` on `CONNECT`,
for `https://www.gmlindia.net/`, `https://gmlindia.net/` and `https://ilsol.net/`
alike). So the live site could not be re-crawled during this pass and **no
official artwork could be downloaded**.

Two consequences, both handled rather than papered over:

1. **Content** is taken from [`docs/CONTENT-MAP.md`](docs/CONTENT-MAP.md), the
   verbatim crawl recorded during the earlier audit of the live site. Every
   figure in it is tagged with the GML page it came from. Nothing was
   rewritten, merged or invented. **It should be re-verified against the live
   site before the site goes to a client**, in case anything has changed since
   that crawl — in particular the DGS registration number, the FMC bond number,
   and the office counts.
2. **Artwork** the live site holds — the official logo, company photography,
   certification and membership marks — is represented by slots, listed below.

## The logo

`assets/brand/gml-logo.svg` is a drawn meridian mark (the prime meridian the
company is named for) locked up with the GML INDIA wordmark, with the type
converted to outlines so it renders identically inside an `<img>`.

**Replace that one file with the official artwork** and the header, footer and
both authentication pages update at once. The `<img>` is sized
`height: 38px; width: auto`; if the official lockup has a very different ratio,
set an explicit width on `.brand__img` in `assets/css/main.css`. If the file is
ever missing, `assets/js/main.js` leaves the inline mark and wordmark visible so
the header never collapses.

The favicon (`assets/favicon.svg`) uses the same mark and should be replaced at
the same time.

## Certification and membership marks

`assets/brand/certs/` is **empty by design**. The certifications section is set
typographically from GML's own register, with the real registration numbers, and
`assets/js/main.js` only requests mark files when `GML_CONFIG.certLogos` is set
to `true` — so the page never fires a request for artwork that is not there and
never shows a broken image.

To switch the marks on, drop the official SVGs into that folder using the slugs
already declared in `index.html` as `data-logo="…"`, then flip `certLogos` to
`true`. Full instructions and the slug list are in
[`assets/brand/README.md`](assets/brand/README.md).

Only add a mark the company is entitled to display.

## Photography

**Every photograph on the site comes from the 240-frame journey sequence that
was supplied with the project.** No stock library is used anywhere.
`tools/build_stills.py` derives `assets/img/` from `assets/frames/desktop/`, and
records which frame each still comes from:

| File | Frame | Used for |
|---|---|---|
| `road.jpg` | 38 | Warehouse card |
| `terminal.jpg` | 92 | About — the terminal plate |
| `ocean-cargo.jpg` | 120 | Ocean Cargo card |
| `containers.jpg` | 148 | the first interlude |
| `project.jpg` | 134 | Project Cargo card |
| `ocean.jpg` | 168 | the second interlude |
| `air.jpg` | 214 | Air Cargo card |
| `sky.jpg` | 238 | spare |
| `iso-tank.jpg` | 148 (crop) | ISO Tank card |
| `hazardous.jpg` | 106 (crop) | Hazardous Cargo card |
| `auth.jpg` | 232 (graded) | login / register backdrop |
| `threshold.jpg` | 240 (graded) | the hand-off out of the journey |

The supplied footage carries GML's own livery — the aircraft reads
**GML INDIA / LOGISTICS BEYOND BORDERS** — which is why it works as brand
imagery rather than as filler.

If official GML photography becomes available, these are the files to replace;
each is referenced by name in `index.html`, and re-running
`tools/build_stills.py` would overwrite them, so remove the corresponding rows
from `STILLS` in that script first.

## Typefaces

Self-hosted in `assets/fonts/`, so the site makes no third-party request and
renders identically offline:

- **Space Grotesk** — display and headings
- **Inter** — body copy
- **JetBrains Mono** — micro-labels, reference numbers, statistics
- **Instrument Serif** — editorial emphasis inside large headlines only

All four are SIL Open Font License 1.1; the licence texts are in
`assets/fonts/licenses/`.

## Nothing else is placeholder

- All 24 `gmlindia.net` destinations in the navigation and footer are the real
  paths from the content map, and there is not one `href="#"` on the site.
- Addresses, phone numbers and email addresses are GML's own, including the six
  group offices and associates.
- The network map plots only real latitudes and longitudes; there is no map
  service and no invented city, coastline or route.
- Track & Trace shows no shipment status, the quote form reports no submission,
  and the login page creates no session. See the "Honest integration points"
  section of the [README](README.md).
