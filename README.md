# Greenwich Meridian Logistics (India) — homepage redesign

A cinematic, scroll-controlled homepage for GML India. All copy, statistics,
service names, contact details, certifications and navigation are taken verbatim
from the live site at <https://www.gmlindia.net/>, which was treated as the
source of truth. See [`docs/CONTENT-MAP.md`](docs/CONTENT-MAP.md) for the full
inventory and the provenance of every figure.

## Run it

No build step and no dependencies — it is static HTML, CSS and JS.

```bash
python -m http.server 8848
```

Then open <http://127.0.0.1:8848/>. Any static server works
(`npx serve`, `php -S localhost:8848`, nginx, S3 + CloudFront).

> Open it through a server, not as a `file://` path — the frame sequence is
> fetched with XHR-backed image loads and needs an HTTP origin.

## Layout

```
index.html                  the homepage
assets/css/main.css         design system + all section styles
assets/js/journey.js        canvas frame-sequence scroll engine
assets/js/main.js           header, nav, reveals, counters, tools, forms
assets/frames/desktop/      240 frames, 1408x792  (~20 MB)
assets/frames/mobile/       240 frames, 854x480   (~8.5 MB)
assets/frames/poster.jpg    first frame — instant paint, reduced-motion still, OG image
assets/favicon.svg
docs/CONTENT-MAP.md         crawled content inventory + statistic provenance
docs/frame-map-*.jpg        contact sheets used to map the journey
tools/build_frames.py       regenerates the frame sets from the source ZIP
```

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
