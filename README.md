# Greenwich Meridian Logistics (India) — homepage redesign

One continuous scroll story for GML India: a 240-frame cinematic opening that
hands off, without a seam, into the whole of the company's own content — and
keeps the same visual language from the first frame to the footer.

All copy, statistics, service names, contact details, certifications and
navigation are GML's own, taken from
[`docs/CONTENT-MAP.md`](docs/CONTENT-MAP.md), which records the crawl of
<https://www.gmlindia.net/> and tags every figure with the page it came from.
Nothing about the company is invented, and figures that differ between GML's own
pages are kept in their own contexts rather than reconciled.

> **Read [`ASSETS.md`](ASSETS.md) before presenting this to the client.** The
> build environment had no network route to `gmlindia.net`, so no official logo,
> photography or certification artwork could be downloaded. The page is built
> with drop-in slots for those files; the placeholders are documented and none
> of them fake a GML asset.

## Run it

No build step and no dependencies — static HTML, CSS and JS, with the fonts
self-hosted.

```bash
python -m http.server 8848
```

Then open <http://127.0.0.1:8848/>. Any static server works
(`npx serve`, `php -S localhost:8848`, nginx, S3 + CloudFront).

> Open it through a server, not as a `file://` path — the frame sequence is
> fetched with image loads and needs an HTTP origin.

## Layout

```
index.html                  the homepage
login.html                  client login  (also serves #register)
register.html               registration  (also serves #login)

assets/css/main.css         design system + every section
assets/css/auth.css         the authentication interface
assets/css/fonts.css        self-hosted @font-face declarations

assets/js/scroll.js         the global scroll director — one loop for the site
assets/js/journey.js        the canvas frame sequence (chapter 01)
assets/js/main.js           header, nav, reveals, counters, network, instruments
assets/js/auth.js           login/register routing, validation, states

assets/frames/desktop/      240 frames, 1408x792  (~20 MB)
assets/frames/mobile/       240 frames, 854x480   (~8.5 MB)
assets/frames/poster.jpg    first frame — instant paint, reduced-motion still, OG image
assets/img/                 section stills, all derived from the frame sequence
assets/fonts/               woff2 + licences (SIL OFL 1.1)
assets/brand/               logo drop-in slot; see assets/brand/README.md

docs/CONTENT-MAP.md         crawled content inventory + statistic provenance
docs/frame-map-*.jpg        contact sheets used to map the journey
tools/build_frames.py       regenerates the frame sets from the source ZIP
tools/build_stills.py       regenerates assets/img/ from the frame sets
ASSETS.md                   what is real, what is a slot, what to replace
```

## The scroll architecture

**The document is the only scroll surface.** Nothing traps the wheel, nothing
nests a second scroller, and every pinned stage is an ordinary
`position: sticky` child of a normal-flow section. Wheel, trackpad, touch,
keyboard (Space / PageDown / End), scrollbar drag and find-in-page all behave
exactly as they would on a plain document.

`assets/js/scroll.js` is a small ScrollTrigger equivalent, written in-house so
the site has no third-party runtime. It runs **one** `requestAnimationFrame`
loop for the whole page — the frame sequence subscribes to it rather than
opening a second one — and its only job per element is to write a single scrub
value:

```html
<section data-sc="top top | bottom bottom">   <!-- start | end, GSAP grammar -->
```

That element then carries `--p` from 0 to 1 across the range, and **the
animation itself is authored in CSS**. Element geometry is measured on refresh
(load, resize, font swap, `<details>` toggle), never per frame, so a scroll
frame is arithmetic; a custom property is written only when its value actually
moved. If the script never runs, the `has-sc` class is never set and the page
is a complete static document.

### The page as one timeline

Measured at 1440x900, where the page is 28.8 viewport heights end to end:

| Share of the page | Chapter | What the scroll drives |
|---|---|---|
| 0 – 22% | **Journey** | 240 frames on one canvas: truck → terminal → ship → ocean → aircraft |
| 22 – 29% | **Threshold** | the last frame is picked back up as a still, a dark wash rises over it, and the company's own positioning surfaces out of the dark |
| 29 – 36% | **About** | the statement holds while the company's account of itself scrolls past; counters, vision / mission / quality policy |
| 36 – 41% | **The chain** | a gold spine draws down the five legs of a shipment |
| 41 – 55% | **Services** | told sideways — the section is tall, its stage is sticky, and vertical document scroll moves the track horizontally |
| 55 – 59% | **Why GML** | the four reasons arrive one at a time against a held headline |
| 59 – 63% | **Director's Note** | the two directors' own words |
| 63 – 66% | *interlude* | a full-bleed frame opening out of a slit |
| 66 – 75% | **Network** | the map's camera moves to each region's real bounding box in turn |
| 75 – 83% | **Solutions** | industry sectors, then Tesla / Ferrari / Audi |
| 83 – 87% | **Register** | certifications and memberships |
| 87 – 90% | *interlude* | open water |
| 90 – 94% | **Tools** | Track & Trace, dimension calculator, the other instruments |
| 94 – 100% | **Contact** | the four-step quote, head office, footer |

The percentages shift with viewport height; the chapter rail on the left tracks
the reader's actual position rather than assuming it.

### Chapter 01 — the frame sequence

`#journey` is 620vh tall (520vh under 900px, 460vh under 620px) with a sticky
stage inside it. Scroll progress through that section maps linearly onto frames
1–240 drawn to a single `<canvas>`:

| Progress | Frames | Stage |
|---|---|---|
| 0 – 26% | 1–62 | Truck on the coastal highway |
| 26 – 37% | 63–88 | Dissolve into the container terminal |
| 37 – 66% | 89–158 | Container ship at berth, gantry cranes |
| 66 – 72% | 159–172 | Camera lifts away over open ocean |
| 72 – 77% | 173–184 | Rise through cloud |
| 77 – 100% | 185–240 | GML India freighter above the cloud deck |

Overlay captions are timed to those ranges with `data-in` / `data-out` windows.
Past 84% the picture sinks towards black at exactly the grade the threshold
section picks the same frame up at, so the hand-off from film to company has no
visible cut.

### Performance

- One `<canvas>`, never 240 `<img>` elements; one rAF loop for the entire site.
- Frames load coarse-to-fine (every 8th, then 4th, 2nd, all) at concurrency 6,
  so the journey is scrubbable after ~30 images instead of after 240.
- The canvas is repainted only when the integer frame index, the viewport size
  or the device pixel ratio actually changes.
- Device pixel ratio capped at 2. Mobile and low-DPR viewports load the 854px
  set, roughly 40% of the bytes.
- Section stills, fonts and CSS together are under 1.2 MB; there is no
  third-party request of any kind at runtime.

## The global network map

Every point is an office or associate GML publishes, plotted from its real
latitude and longitude on an equirectangular projection with a true graticule.
There is no map service and no invented city or coastline. Selecting a region —
by clicking a tab, or simply by continuing to scroll — moves the camera to that
region's actual bounding box; stroke weights, marker radii and type size are
divided by the zoom so the drawing keeps its weight. Labels are thinned so type
never collides, and all 26 India offices are written out in full as text below
the plot.

## Accessibility

- Semantic sections and headings, skip link, visible focus rings throughout.
- Tab lists (tracking reference, quote steps, network regions, login/register)
  are real `role="tablist"` widgets with arrow-key support.
- `prefers-reduced-motion` switches off the motion, **not the content**: the
  journey becomes a graded still with its captions in normal flow, the
  horizontal services chapter becomes a vertical stack — otherwise four of the
  six services would never come into view — and every pinned chapter collapses
  to its natural height. Nothing is hidden and the page is ~20 screens instead
  of ~29.
- The reveal animations have a geometric safety net, so a throttled or occluded
  tab can never leave content permanently invisible.

## Honest integration points

Nothing in this build reports something that did not happen.

`window.GML_CONFIG` in `assets/js/main.js`:

```js
{
  trackUrl: 'https://www.gmlindia.net/',   // where Start Tracking hands the reference off
  quoteEndpoint: null,                     // POST target for the quote form
  quoteMailto: 'info@gmlindia.net',        // used while quoteEndpoint is null
  certLogos: false                         // see assets/brand/README.md
}
```

`window.GML_AUTH` in `assets/js/auth.js`:

```js
{
  endpoint: null,     // POST target for real authentication
  forgotUrl: null     // a real password-recovery flow, once there is one
}
```

- **Track & Trace** never shows a shipment status. It hands the reference to the
  official GML service in the URL.
- **The quote form** posts to `quoteEndpoint` when one is set; until then it
  composes a real mail draft to `info@gmlindia.net` rather than showing a
  success state.
- **Login / Register** is an interface layer. With no `endpoint` set, a valid
  submission says so in as many words; no session, token or redirect is
  invented, and no credential is stored, logged or put in a URL. The tab state
  is linkable (`login.html#login`, `register.html#register`), survives reload
  and works with the back button.

## QA hooks

`window.GMLScroll` exposes `refresh()`, `progressOf(el)` and `sync()`;
`window.GMLJourney` exposes `sync()` and `state()`, so the journey can be driven
and inspected where the animation frame is throttled.

## Regenerating the assets

```bash
python -m pip install Pillow
python tools/build_frames.py path/to/extracted-frames   # the 240 source JPGs
python tools/build_stills.py                            # assets/img/ from the frames
```
