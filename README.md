# Greenwich Meridian Logistics (India) — site redesign

A cinematic, scroll-controlled homepage for GML India, and the 25 inner pages
behind it. All copy, statistics, service names, contact details, certifications
and navigation are taken verbatim from the live site at
<https://www.gmlindia.net/>, which was treated as the source of truth. See
[`docs/CONTENT-MAP.md`](docs/CONTENT-MAP.md) for the full inventory and the
provenance of every figure.

The site is self-contained: every link resolves inside this repository, and
nothing hands the visitor back to the old site.

## Run it

No build step and no dependencies — it is static HTML, CSS and JS.

```bash
python -m http.server 8848
```

Then open <http://127.0.0.1:8848/>. Any static server works
(`npx serve`, `php -S localhost:8848`, nginx, S3 + CloudFront). Every page is a
plain `.html` file at the root, so the site can also be dropped into a
subdirectory unchanged — all links are relative.

> Open it through a server, not as a `file://` path — the frame sequence is
> fetched with XHR-backed image loads and needs an HTTP origin.

## Layout

```
index.html                  the homepage — the cinematic scroll journey
about.html …                25 generated inner pages (see below)
assets/css/main.css         design system + homepage section styles
assets/css/pages.css        inner-page hero, tables, cards, instruments
assets/js/journey.js        canvas frame-sequence scroll engine (homepage only)
assets/js/main.js           header, nav, reveals, counters, calculator, quote form
assets/js/pages.js          inner-page instruments: filters, clocks, converter, tracking
assets/frames/desktop/      240 frames, 1408x792  (~20 MB)
assets/frames/mobile/       240 frames, 854x480   (~8.5 MB)
assets/frames/poster.jpg    first frame — instant paint, reduced-motion still, OG image
assets/favicon.svg
docs/CONTENT-MAP.md         crawled content inventory + statistic provenance
docs/frame-map-*.jpg        contact sheets used to map the journey
tools/build_frames.py       regenerates the frame sets from the source ZIP
tools/build_pages.py        regenerates the inner pages from the fragments
tools/pages/*.html          one content fragment per inner page
```

## The inner pages

Every link in the site now resolves to a page in this repository. Nothing
navigates to `gmlindia.net` or `ilsol.net` any more.

| Page | Was |
|---|---|
| `about.html` | `/AboutUs/Index` |
| `directors-note.html` | `/AboutUs/DirectorsNote` |
| `incorporation.html` | `/AboutUs/GMLAffiliation` |
| `associates.html` | `/AboutUs/Associates` |
| `locations.html` | `/AboutUs/GMLIndia` |
| `services.html` | `/Service/OurServices` |
| `ocean-cargo.html` | `/Service/SeaFreight` |
| `air-cargo.html` | `/Service/AirFreight` |
| `iso-tank.html` | `/Service/ISOTank` |
| `project-cargo.html` | `/Service/ProjectCargo` |
| `hazardous-cargo.html` | `/Service/HazardousCargo` |
| `warehousing.html` | `https://ilsol.net/` |
| `containers.html` | `/Service/TypesOfContainer` |
| `dimension-calculator.html` | `/ETools/FreightCalculator` |
| `world-time.html` | `/ETools/WorldTime` |
| `world-ports.html` | `/ETools/WorldPorts` |
| `currency-converter.html` | `/ETools/CurrencyConverter` |
| `sailing-schedule.html` | `/Vessel/VesselSchedule/…` |
| `careers.html` | `/Career/JobSearch` |
| `contact.html` | `/Home/ContactUs` |
| `company-profile.html` | `/Home/DownloadGMLProfile` |
| `terms.html` | `/sitemap/termsandconditions` |
| `privacy.html` | `/sitemap/privacypolicy` |
| `sitemap.html` | `/Sitemap/Sitemap` |
| `tracking.html` | new — the "Start Tracking" destination |

Content is drawn from [`docs/CONTENT-MAP.md`](docs/CONTENT-MAP.md). Company
facts, statistics, addresses, specifications and certifications are the crawled
originals; the connective writing around them is new.

### Regenerating them

The inner pages are generated but committed, so the site stays a no-build
static site. Each page is a content fragment in `tools/pages/<slug>.html`
wrapped in shared chrome — head, header, navigation, hero band, footer — by:

```bash
python tools/build_pages.py
```

Edit the fragment for page content; edit `tools/build_pages.py` for anything
that appears on every page. The navigation is defined once in that script and
emitted three times (desktop menu, mobile sheet, footer), so a link cannot
drift between them. `index.html` is hand-authored and the script never touches
it.

### What the instruments actually do

These are working tools, not screenshots, and none of them fabricates a result:

- **Dimension calculator** — CBM, volumetric and chargeable weight. Sea at
  1 CBM = 1,000 kg, air at the IATA 6,000 divisor.
- **World time** — live clocks rendered from the browser's own `Intl` time zone
  data, so daylight saving is handled without a table to maintain.
- **World ports** — 86 ports with UN/LOCODE, searchable and filterable by
  region. Flagged on the page as reference data to confirm before filing.
- **Currency converter** — fetches live reference rates from
  `open.er-api.com`; if that fails it says so and converts at a rate you type
  in instead. It never shows a rate it does not have.
- **Tracking** — validates the reference and hands it to the routes that can
  answer it (a pre-addressed email and the operations number). It shows no
  milestones, because the site has no feed to read them from. Point
  `GML_CONFIG.trackUrl` in `assets/js/main.js` at a real endpoint and the same
  form drives it.
- **Sailing schedule and career forms** — compose a real message to
  `info@gmlindia.net` rather than showing a success state nothing produced.
  Set `GML_CONFIG.quoteEndpoint` to POST instead.

## Regenerating the frames

The committed frame sets were produced from
`Logistics_journey_video_production_1080p_202609050848-frames.zip` (240 JPGs at
1920x1080). To rebuild them:

```bash
python -m pip install Pillow
python tools/build_frames.py path/to/extracted-frames
```

## The scroll journey

`#journey` is 620vh tall (520vh under 900px, 460vh under 620px) with a
`position: sticky` stage inside it. Scroll progress through that section maps
linearly onto frames 1–240, which are drawn to a single `<canvas>`:

| Progress | Frames | Stage |
|---|---|---|
| 0 – 26% | 1–62 | Truck on the coastal highway |
| 26 – 37% | 63–88 | Dissolve into the container terminal |
| 37 – 66% | 89–158 | Container ship at berth, gantry cranes |
| 66 – 72% | 159–172 | Camera lifts away over open ocean |
| 72 – 77% | 173–184 | Rise through cloud |
| 77 – 100% | 185–240 | GML India freighter above the cloud deck |

Overlay captions are timed to those ranges with `data-in` / `data-out` windows on
each `.jo__block`.

### Performance notes

- One `<canvas>`, never 240 `<img>` elements.
- Frames load coarse-to-fine (every 8th, then 4th, 2nd, all) at concurrency 6,
  so the whole journey is scrubbable after ~30 images instead of after 240.
- The canvas is repainted only when the integer frame index, the viewport size
  or the device pixel ratio actually changes.
- Device pixel ratio is capped at 2.
- Mobile and low-DPR viewports load the 854px set, roughly 40% of the bytes.
- `prefers-reduced-motion` replaces the whole sequence with a still and lays the
  captions out in normal flow.

### Configuration

`window.GML_CONFIG` in `assets/js/main.js` holds the two integration points:

```js
{
  trackUrl: 'https://www.gmlindia.net/',   // where Start Tracking hands off
  quoteEndpoint: null,                     // POST target for the quote form
  quoteMailto: 'info@gmlindia.net'         // used while quoteEndpoint is null
}
```

`window.GMLJourney` exposes `sync()` and `state()` for QA and for driving the
journey where the animation frame is throttled.
