# PROMPT — "One breath of smoke, traced from orbit"

Copy everything below the line into your AI IDE (Cursor / Claude Code / Copilot Workspace / v0 / Lovable). It is
written to be self-sufficient: it contains the concept, the art direction, the technical architecture, the data model,
the API contracts and the acceptance criteria, so the agent never has to invent the boring parts and can spend all of
its effort on making it beautiful.

> **Working reference implementation:** this repo. `src/three/engine.ts` (camera + scenes), `src/lib/forecast.ts`
> (the model), `src/components/Journey.tsx` (the narrative), `src/db/schema.ts` (persistence).

---

## THE PROMPT

Build a **cinematic, scroll-driven single-page web experience** called **ATMOS/48** that explains how a hyper-local air
quality forecast is made — by flying the user through the actual data pipeline, from orbit down to their own street —
and ends by giving them a real, generated **48-hour PM2.5 forecast and an alert signup** for the neighbourhood they type
in.

Stack: **Next.js (App Router) + TypeScript + Tailwind CSS v4 + PostgreSQL via Drizzle ORM** for the UI/API/data, and
**Three.js (WebGL2, custom GLSL) + GSAP ScrollTrigger** for the cinematic layer. No page loads, no route changes after
boot: the whole thing is one continuous camera move.

---

### 1. The five scenes (this is the product)

A single fixed full-screen WebGL canvas sits behind the HTML. Scroll position (0 → 1) drives a **camera keyframe
track**; HTML narrative panels fade in over it. Every data source gets its own scene so a judge or a journalist
understands the pipeline in 60 seconds.

| # | Scene | Camera | What the user sees |
|---|-------|--------|--------------------|
| 00 | **Hero** | 21,000 km, Earth filling the frame | Title, "scroll to descend" cue, live telemetry HUD |
| 01 | **Orbit — Sentinel-5P** | 824 km, India centred | A **2,600 km TROPOMI swath** sweeps diagonally across India as a glowing ribbon with a bright leading edge, a satellite marker riding the orbit trace |
| 02 | **Punjab & Haryana — VIIRS** | dive to ~900 km | **~1,150 fire detections pop in as glowing points**, staggered by overpass time, over a crisp vector map of Punjab/Haryana/Delhi state borders |
| 03 | **Transport — 850 hPa winds** | glide SE to ~500 km | **Smoke plume particles advect along 3D wind vectors** (animated dashes flowing along each arrow) toward Delhi, plume-front label moving with them |
| 04 | **Inversion — Delhi** | 75–190 km, low grazing angle | A **translucent gridded lid descends from 2,400 m to 150 m** over the glowing city; the trapped haze compresses beneath it |
| 05 | **Your street** | hold over the NCR | Search box → the pin drops **in the 3D scene** behind the panel; 48-hour forecast chart + alert signup |

**Camera rig.** Do not animate raw camera position/lookAt. Drive a state object
`{ targetLat, targetLng, altitude, elevation, azimuth, fov, roll }` through an array of keyframes with smoothstep
interpolation, then derive the camera each frame from a **local tangent-plane basis** (up / north / east at the target
lat-lng). `elevation` = angle above the tangent plane (90° = nadir, 15° = dramatic grazing). Blend `camera.up` from
world-Y (orbit) to the local surface normal (near-surface). Altitude is in Earth radii so the same numbers work from
21,000 km to 75 km.

**Continuity is the whole point.** There must be no cut, no crossfade to a flat map, no "chapter" reset. One camera,
one globe, five altitudes.

---

### 2. Art direction (be specific, be disciplined)

A **night-ops satellite-imagery** aesthetic — think NASA Worldview at 3 a.m. crossed with a flight-deck HUD.

- **Palette:** space black `#03060d` → deep ocean navy `#0a1c33`; land in slate `#0d1725`–`#3a4a5c`; **city lights in
  amber** `#ffd9a0`; instrument **cyan** `#7fd7ff` for everything the machine is doing; **fire orange** `#ff6b35` →
  `#ffcf5c`; smoke in warm grey. AQI categories use the CPCB ramp: `#22c55e → #a3e635 → #facc15 → #fb923c → #ef4444 → #a855f7`.
- **Type:** one geometric grotesk for headlines at very light weight (`Space Grotesk 300`), one mono for **all**
  data/labels/units (`JetBrains Mono`). Headline sizes should be huge and tight (`-0.03em`, `0.86` line-height);
  everything data-flavoured is 9–13 px, uppercase, `0.2–0.34em` letterspacing.
- **Never use a card grid.** Panels are large, softly-rounded (`28px`), 55 %-opaque dark glass with a 1 px hairline
  border, `backdrop-blur` — they must read as HUD overlays on imagery, not as a SaaS dashboard.
- **HUD chrome:** top-left wordmark, top-right current scene index, bottom-left live telemetry
  (`ALT 824 km · 29.60°N 75.40°E · EL 66°`), right-edge scene rail with a progress line. A radial vignette + an SVG
  `feTurbulence` film grain at 5 % overlay for a filmic finish.
- **Motion:** HTML reveals are slow and calm (`y: 46 → 0`, `blur(6px) → 0`, 1.05 s, `power3.out`). Numbers count up.
  In-scene motion (fires flickering, dashes flowing, plume drifting) runs continuously regardless of scroll.
- **Legibility first:** every text block sits on either the glass panel or a vignette. If a label is over bright
  imagery it gets a text-shadow.

---

### 3. The globe, the shaders, the data (no fake textures)

Build the Earth **procedurally from real vector data** — never from a downloaded photo texture, which will never line
up with the latitudes you are flying to.

- Rasterise **Natural Earth 50 m land** (GeoJSON, simplified with Douglas–Peucker to ~0.05° and quantised) into a
  3072 × 1536 canvas → land mask texture. Write a matching **night-lights texture**: amber radial-gradient speckles
  around ~80 hand-curated city coordinates plus 26,000 latitude-weighted village speckles, clipped to the land mask
  with `destination-in`.
- **Globe surface shader:** land/ocean two-tone with hash-noise grain, a real `dot(normal, sunDir)` day/night
  terminator with a warm twilight band, city lights that bloom only on the night side, a fresnel limb-glow, a
  procedural 15° graticule, and a regional smoke-haze term. Sample UV must exactly equal
  `(lng + 180)/360, (90 − lat)/180` and the lat-lng → XYZ helper must be
  `x = −r·sinφ·cosθ, y = r·cosφ, z = r·sinφ·sinθ` with `φ = (90−lat)°`, `θ = (lng+180)°` — otherwise the fires will
  not sit on the right fields.
- **Atmosphere:** two back-side spheres with an additive fresnel shader, sun-weighted, different powers (tight inner
  glow + wide outer halo).
- **Swath:** a ribbon mesh built from the orbit great circle (normal = cross of two track points), 6 across-track
  columns, ±1,300 km wide; the fragment shader brightens the leading edge from a `uProgress` uniform and draws moving
  scan lines.
- **Fires:** `THREE.Points` with a custom shader — per-point `aBirth` (pop-in order by overpass), `aSize` (from FRP),
  `aSeed` (flicker), `aColor` (temperature ramp). Additive, `depthWrite: false`, perspective-attenuated point size.
  Generate them deterministically with a seeded PRNG (mulberry32) clustered around 30 real rice-burning districts with
  realistic weights, so the server model and the WebGL scene always agree.
- **Winds:** `LineSegments` hedgehog on a 0.85° grid, each arrow = shaft + two head strokes, with a `fract(aT · dash −
  time · speed)` shader so the dashes flow along the arrow.
- **Plume:** 3,800 particles CPU-advected each frame along the wind field on the sphere (lat/lng deltas from wind
  speed and direction), buoyant rise for the first 120 km, then compressed under the lid when within 90 km of Delhi,
  respawned at the source fire when aged out.
- **Borders:** raster masks pixelate when you are 100 km up — draw regional state borders as **3D line geometry**.
- **Post:** `EffectComposer` + `UnrealBloomPass` (strength ≈ 1.05, radius 0.72, threshold 0.14) + `OutputPass` with
  ACES tone mapping. Guard the composer in a try/catch and fall back to a direct render.

---

### 4. The forecast model (make it defensible)

One pure TypeScript module, shared by the client and the server, no I/O. Inputs: lat, lng, a neighbourhood
micro-environment offset, a start time. Output: 48 hourly objects.

```
PM2.5(t) = ( background + local + smoke(t) + dust(t) ) × ventilation(t) × AR(1) noise
```

- **smoke(t):** for each burning district, distance + bearing to the target; alignment with the 850 hPa wind; a
  diurnal burn-emission profile (peaks 14:30 and 20:30 local); a plume travel time
  `distance / max(9, wind·3.6·1.7) km/h` (the residual layer moves faster than the surface wind); exponential ageing
  `exp(−travel/26)`; a distance penalty. Calibrate the sum with a soft normaliser so a peak-season window lands at
  ~170–200 µg/m³ of smoke contribution.
- **ventilation(t):** boundary-layer depth from `150 + 1290·sin(π(h−6.4)/13.2)^0.75` metres, then
  `(1150 / MH)^0.5` clamped to 0.85–1.8. This alone produces the observed 2–2.5× night-to-afternoon swing — the single
  most important term in the forecast.
- **local(t):** `52 + neighbourhood offset + traffic profile`; **dust(t):** a daytime term scaled by `1/(1+wind)`.
- Output per hour: pm25, low/high confidence band that **widens with lead time**, AQI (CPCB PM2.5 sub-index with the
  six breakpoints), category + colour + advice, wind speed/dir, mixing height, smoke/local/dust split, upwind fire
  count, and a human `trigger` label ("Smoke plume overhead", "Inversion trap", "Near-calm winds", "Ventilating").
- Also return: peak hour, worst 6-hour overnight window, average smoke share, hours above 300, and the dominant source
  districts with distance/transit/arrival time, plus a plain-language summary paragraph that names real numbers.
- Target output for a peak-season day: afternoon trough 110–180 µg/m³, overnight peak 380–470 µg/m³, AQI 440–490
  (Severe), 18–24 hours above 300.

---

### 5. Database & API

Drizzle + Postgres, four tables: `neighborhoods` (slug, name, district, state, lat, lng, population, baseline_pm25,
profile), `subscribers` (contact, channel, neighborhood, aqi_threshold, morning_briefing, source), `forecast_runs`
(cache + share links: peak pm25/aqi, jsonb payload), `alert_events`.

Seed ~140 real Delhi-NCR localities (Anand Vihar, Bhalswa, Mundka, Sangam Vihar, Sector 62 Noida, Cyber City,
Bahadurgarh, Panipat, Ludhiana…) with plausible coordinates and a micro-environment profile
(`industrial +19`, `arterial +13`, `landfill +16`, `ridge −11`, `suburb −3`). Seeding must be **idempotent** and
**lazy** (called from the routes, never from the build), and the API must degrade to the static list if the table is
missing.

- `GET /api/neighborhoods?q=` → ranked fuzzy matches (exact → prefix → contains, then by population); `?lat=&lng=` →
  nearest 6 for "use my location"; no query → the 6 most populous.
- `GET /api/forecast?slug=` or `?lat=&lng=&label=` → the full 48-hour payload; upserts a `forecast_runs` row.
- `POST /api/subscribe` → validates email or E.164 phone, dedupes per contact+neighbourhood, inserts, and writes a
  preview `alert_events` row if the cached peak crosses the threshold. `GET` returns the subscriber count for social
  proof.
- `GET /api/health` → `{ ok: true }` after a `select 1`.

---

### 6. The finale (this is the shareable bit)

- A **search box** with a debounced dropdown, "use my location", and instant selection. On selection: fetch the
  forecast **and drop a pulsing pin at those exact coordinates in the 3D scene behind the panel** (ring + beam + glow +
  a label showing the coordinates). That single interaction is what makes the whole journey feel personal.
- A **48-hour SVG chart**: segment-coloured PM2.5 line by AQI category, a widening confidence band, shaded night
  columns, a dashed peak marker, a hover scrubber with a tooltip (time, PM2.5, AQI, wind, lid height, trigger), and —
  crucially — a **second strip showing the boundary-layer depth as bars**, so the user *sees* the lid collapse and the
  line jump. This is the pedagogical payoff of scene 04.
- Four headline stats (now / 48 h peak / smoke share / upwind fires), the summary paragraph, a "what happens next"
  advice list, and chips naming the dominant source districts.
- **Alert signup:** email or phone, an AQI-threshold selector (100/200/300/400), a success state that reports how many
  people are already subscribed. No auth, no friction — one field and one button.
- **Deep links:** `?place=dwarka#you` must restore the exact forecast and scroll to the finale, so the experience is
  embeddable in a news article.

---

### 7. Copy (write it like a documentary, not a datasheet)

Hero: *"One breath of smoke, traced from orbit."* Sub: *"A rice field is set alight in Punjab at 4 pm. Nineteen hours
later its smoke is in a bedroom in Delhi."* Then per scene: *"First, a satellite smells the air."* · *"Then we find the
fires."* · *"The wind decides who breathes it."* · *"Then the sky puts a lid on it."* · *"Now put your address on it."*
Always pair one hard fact with one human sentence — e.g. *"Each point is a farmer clearing two or three acres of rice
stubble in about twenty minutes — the cheapest way to clear a field before the wheat window closes."* Footer must carry
the data sources (Sentinel-5P TROPOMI, VIIRS 375 m, ERA5, CPCB) and honest caveats.

---

### 8. Non-negotiable engineering requirements

1. Three.js and the 190 kB of geodata must be **dynamically imported** from the client effect, so first paint is HTML.
2. The renderer, composer, GSAP context and ScrollTrigger must all be torn down on unmount; no leaked rAF loops.
3. `devicePixelRatio` capped at 1.75; texture sizes bounded; 60 fps on a 2020 laptop.
4. Works on mobile: the panels go full-width, the scene rail hides below `sm`, and the chart is touch-scrubbable.
5. `prefers-reduced-motion` respected (scroll still works, autonomous motion damped).
6. Every route handler is `force-dynamic`; nothing touches the DB at build time.
7. TypeScript strict, zero eslint errors, `next build` clean.
8. If WebGL fails to initialise, show a banner and let the story still be readable.

### 9. Acceptance test

> Scroll from top to bottom in one drag: the Earth starts whole, a satellite swath crosses India, you fall 20,000 km
> into a field of 1,150 fires, the smoke streams south-east on visible wind arrows, a lid slams down over Delhi, and
> then you type "Anand Vihar", a pin drops on the map behind the form, and a 48-hour chart tells you the peak arrives
> at 03:00 at 419 µg/m³ with 47 % of it from Sangrur's fires 228 km away. Then you sign up. Then you copy the link and
> send it to someone.

---

## WHY THIS WORKS

- **One camera, five altitudes** = the pipeline is *felt* as a descent, not read as a diagram.
- **Every claim is visualised by the dataset that supports it**, so it survives expert scrutiny.
- **The finale converts the audience into the dataset**: the user's own coordinates become a glowing pin in the same
  world they just flew through.
- **The chart's boundary-layer strip closes the loop** between the pretty 3D lid and the number in their feed.
- **Deep links + one-field signup** make it a media-embed product, not a demo.
