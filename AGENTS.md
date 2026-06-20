# AGENTS.md — Find My Ecological Garden

**Repository:** `github.com/tinyforests/super-barnacle`
**Product name:** Find My Ecological Garden
**Live domain:** www.findmyecologicalgarden.com
**G&S system layer:** Discovery
**Last updated:** June 2026
**Status:** Functional MVP — known issues documented below

> **Repo name warning.** The GitHub repository is named `super-barnacle`. The product is *Find My Ecological Garden*. Do not use "super-barnacle" in any public-facing copy, commit messages that affect user-visible text, or cross-property links. When referencing this repo in other G&S documentation, use the product name.

---

## 1. What this repo is

Find My Ecological Garden is the **Discovery layer** in the G&S system spine:

**Culture → Discovery → Registry → Incentives**

Its job is narrow and specific: take a person who now *wants* an ecological garden (because Culture did its work) and give them the knowledge they need to act. That means:

1. Detecting their **Ecological Vegetation Class (EVC)** from a street address or GPS coordinate
2. Showing them the **indigenous plant palette** that belongs to that EVC
3. Offering a way to act immediately — an **ecological planting kit** or an **EVC-branded tee**
4. Creating a clear path to the **Ecological Registry**, where the garden becomes a permanent, verified record

Every feature, copy line, and design decision in this repo should be evaluated against those four steps. If it doesn't serve one of them, question whether it belongs here.

---

## 2. What this repo is NOT

- It is **not** a plant directory or a general nature reference. It serves one place-specific question: *what belongs here, at this address?*
- It is **not** the Registry. It feeds the Registry. Do not add Registry features here.
- It is **not** Village Rewards. Previous versions of this file incorrectly described the Village Rewards loyalty platform (Incentives layer). Disregard any documentation that describes QR codes, points, traders, Supabase, or loyalty mechanics — that is a different repo entirely (`github.com/tinyforests/villagerewards`).
- It is **not** a consumer app. The brand book is clear: border-radius zero, no rounded corners, no gradients. This is a registry and a record, not a product catalogue.

---

## 3. Single source of truth rule

**One thing, one place.**

| Thing | Where it lives | Do not duplicate |
|---|---|---|
| EVC kit details (description, plant counts, slug) | `getKitDetails()` in `evc-fetch.js` | `FOREST_KITS` in `explore.html` currently duplicates this — see `/docs/DATA.md` |
| EVC name overrides | `getEvcName()` in `explore.html` + `manualNames` object | These exist in two places — known debt |
| Mosaic code remapping | `mosaicCodeMapping` in `evc-fetch.js` | Do not add a second copy elsewhere |
| Stripe payment URLs | `evc-fetch.js` only | If URLs change, change them here and nowhere else |
| Brand colours and typography | CSS custom properties (once implemented — see `/docs/BRAND.md`) | Not in inline styles |

When you find something defined in two places, consolidate before extending. Creating a third copy is not acceptable.

---

## 4. Ecological disclaimer

This tool detects the **pre-1750 Ecological Vegetation Class** for an address using the Victorian Government's NV2005 EVCBCS dataset. That classification reflects the indigenous vegetation community that would have occupied the site before European settlement.

When working on EVC detection or plant data, hold this in mind:

- An EVC is not a prescription. It describes what *belonged* here. The actual garden must account for current soil condition, microclimate, overstorey loss, and site history.
- Urban addresses often fall outside mapped polygons. The fallback logic (see `/docs/EVC-SYSTEM.md`) is an informed approximation, not a verified result. The urban fallback disclaimer shown to users must remain visible and honest.
- Plant lists are curated for ecological function first, then aesthetics. Do not add plants because they are popular or available; add them because they are EVC-correct and locally sourced.
- "Indigenous" means of this EVC and this place. "Native" means Australian. These are not interchangeable. Use "indigenous" in all copy.

---

## 5. Current state

### What works

- Address geocoding (Nominatim) with Victorian address filtering
- Address autocomplete with residential-address filtering
- GPS geolocation with iOS-specific handling
- VicGov WFS API query for EVC polygon data
- Turf.js point-in-polygon matching for exact EVC assignment
- Urban area fallback with on-screen disclaimer
- `curated-plants.json` plant palette lookup by EVC code
- Plant image tooltips (camera icon hover)
- Forest kit display with composition data and Stripe purchase link
- EVC tee display with size selector and Stripe purchase link
- EVC modal with map, description, plant list, Registry link, kit, tee
- URL parameter sharing (`?evc=&name=`) for shared EVC links
- `explore.html` EVC browser with filter chips and search
- Signup email capture (Google Form) on modal and explore page
- EVC lookup logging (Google Form) on every search
- PWA install on iOS and Android (see known issues)
- `about.html` and `contact.html` secondary pages

### Known issues and pending work

See §10 for the full backlog. Critical items that affect production or launch:

**⛔ LAUNCH BLOCKER — Privacy disclosure absent**
Every EVC lookup silently captures the user's street address and GPS coordinates (6dp) and POSTs them to a Google Form. There is no privacy disclosure, no data collection notice, and no opt-out. This must be resolved before any marketing or public launch. See `/docs/PRIVACY.md`.

**⛔ LAUNCH BLOCKER — Nominatim usage policy**
The address search and reverse geocode use Nominatim's public API (`nominatim.openstreetmap.org`) without a custom `User-Agent` header. Nominatim's usage policy requires a valid identifying header for any app beyond personal use. A production app without this header risks being blocked. See `/docs/EVC-SYSTEM.md`.

**🔴 PRODUCTION-AFFECTING — Service worker BASE_PATH mismatch**
`service-worker.js` caches paths prefixed with `/super-barnacle/`. On the live domain (`www.findmyecologicalgarden.com`) all paths resolve from `/`. The service worker never matches a request and is entirely inoperative in production. See `/docs/PWA.md`.

~~**🟡 Brand — Border-radius not enforced**~~ ✅ Fixed June 2026 — all border-radius values set to 0 across HTML files and evc-fetch.js inline styles.

~~**🟡 Brand — Wrong body font loaded**~~ ✅ Fixed June 2026 — IBM Plex Sans now loaded; Mono retained for data/timestamps only.

~~**🟡 Contact page — Email links broken**~~ ✅ Fixed June 2026 — replaced Cloudflare-protected URLs with direct mailto/tel links.

---

## 6. Tech stack

### Frontend
- **Framework:** None — pure static HTML/CSS/JS
- **Deployment:** GitHub Pages → `www.findmyecologicalgarden.com` (CNAME)
- **Build process:** Zero. Edit files, commit, push. Live in ~30 seconds.
- **PWA:** Service worker (`service-worker.js`) + manifest (`manifest.json`)

### External services
- **Nominatim** (`nominatim.openstreetmap.org`) — address geocoding and reverse geocode. Free, no key required, but usage policy applies. See `/docs/EVC-SYSTEM.md`.
- **VicGov WFS API** (`opendata.maps.vic.gov.au/geoserver/wfs`) — EVC polygon data. Public, no key required. Can return XML errors; handled in code.
- **Stripe** — forest kit and tee purchases. Payment links hardcoded in `evc-fetch.js`. See `/docs/COMMERCE.md`.
- **Google Forms** — EVC lookup logging, email signups, preorder capture. See `/docs/PRIVACY.md`.
- **Leaflet** (`unpkg.com/leaflet@1.9.4`) — map rendering in modal and background map
- **Turf.js** (`unpkg.com/@turf/turf`) — point-in-polygon for exact EVC match
- **Google Fonts** — Abril Fatface, IBM Plex Mono (IBM Plex Sans still needs to be added)

### No backend
There is no server, no database, no authentication, and no API of G&S's own. All state is client-side. All data is either in `curated-plants.json` or fetched from third-party services.

---

## 7. File structure

```
super-barnacle/
├── index.html              Main app — 3-section scroll flow + EVC modal
├── explore.html            EVC browser — grid with filter chips and search
├── about.html              Studio profiles — Tyson and Natasha
├── contact.html            Contact details and inquiry list
├── evc-fetch.js            All EVC logic, modal rendering, commerce (58KB — see §8)
├── curated-plants.json     Plant palette data, EVC descriptions, recommendations (61KB)
├── service-worker.js       PWA offline caching (broken in production — see /docs/PWA.md)
├── manifest.json           PWA install metadata
├── ecological-garden-kit.jpg  Fallback kit image (219KB — unoptimised)
├── favicon.png
├── icon-192.png
├── icon-512.png
├── CNAME                   www.findmyecologicalgarden.com
├── AGENTS.md               This file
├── CLAUDE.md               Universal G&S file — do not edit
├── SUPER_MIND.md           Universal G&S file — do not edit
├── AI_CONTEXT.md           Universal G&S file — do not edit
├── docs/
│   ├── EVC-SYSTEM.md       Detection pipeline, WFS API, polygon matching
│   ├── DATA.md             curated-plants.json schema, EVC naming, mosaic codes
│   ├── COMMERCE.md         Stripe links, kit/tee pricing, preorder flow
│   ├── PWA.md              Service worker, manifest, deployment, known mismatch
│   ├── PRIVACY.md          Data collection, disclosure gap, Nominatim policy
│   ├── BRAND.md            Repo-specific brand compliance
│   ├── DECISIONS-LOG.md    Architectural decisions and their rationale
│   └── LAUNCH-CHECKLIST.md Pre-launch verification checklist
└── images/
    ├── evcs/               EVC landscape photos (33 images + placeholder)
    ├── plants/             Individual plant photos for tooltip previews (33 images)
    └── tees/               EVC tee product photos (38 images)
```

### Note on evc-fetch.js

At 58KB, `evc-fetch.js` is doing too much: geocoding, autocomplete, EVC detection, polygon matching, modal rendering, plant display, kit commerce, tee commerce, preorder logic, and analytics logging. It is not currently broken, but any significant change risks breaking something else. Read `/docs/EVC-SYSTEM.md` and `/docs/COMMERCE.md` before touching it.

---

## 8. System index

Read the relevant `/docs/` file before touching each system.

| System | File | Read when... |
|---|---|---|
| EVC detection pipeline | `/docs/EVC-SYSTEM.md` | Touching geocoding, WFS query, polygon match, or urban fallback |
| Plant data and EVC naming | `/docs/DATA.md` | Adding/editing EVCs, plant lists, or EVC name resolution |
| Commerce | `/docs/COMMERCE.md` | Changing Stripe links, prices, kit availability, or preorder |
| PWA and deployment | `/docs/PWA.md` | Touching service worker, manifest, or deployment config |
| Privacy and data logging | `/docs/PRIVACY.md` | Adding any new data capture or changing how lookups are logged |
| Brand compliance | `/docs/BRAND.md` | Any visual or copy change |
| Decisions log | `/docs/DECISIONS-LOG.md` | Before making an architectural decision |
| Launch checklist | `/docs/LAUNCH-CHECKLIST.md` | Before any public launch or significant release |

---

## 9. Before-editing checklist

Run through these twelve questions before making any change. If the answer to any question is no, stop and surface the conflict.

**Brand**
1. Does every element I'm adding or changing have `border-radius: 0`?
2. Is prose using IBM Plex Sans and data/timestamps using IBM Plex Mono?
3. Am I using a flat `#3d4535` background, not a gradient?
4. Am I adding or modifying a CSS class — not writing an inline style?

**Voice**
5. Have I written "indigenous" everywhere I mean EVC-correct, not "native"?
6. Does my copy avoid "movement", "mainstream", "harmony", "sustainable", "eco-friendly", "green"?
7. Is the language grounded and specific — or aspirational and vague?

**System**
8. Have I read the relevant `/docs/` file for the system I'm changing?
9. If I'm adding or changing a data structure, is there only one place it lives?
10. If I'm capturing any new user data, have I updated `/docs/PRIVACY.md` and added UI disclosure?

**Spine**
11. Does this change serve the Discovery function — helping someone know their place?
12. Does it preserve or improve the path from Discovery to the Registry?

---

## 10. Known issues backlog

Issues identified in the May 2026 audit, not yet resolved. Check these off as work is completed rather than rediscovering them.

| # | Priority | Issue | Relevant doc |
|---|---|---|---|
| 1 | ⛔ BLOCKER | No privacy disclosure for coordinate logging | `/docs/PRIVACY.md` |
| 2 | ⛔ BLOCKER | Nominatim missing User-Agent header | `/docs/EVC-SYSTEM.md` |
| 3 | 🔴 PROD | Service worker BASE_PATH inoperative on live domain | `/docs/PWA.md` |
| 4 | ✅ FIXED | Email links broken (Cloudflare protection, no proxy) | `about.html`, `contact.html` |
| 5 | ✅ FIXED | border-radius: 0 not enforced — systematic throughout | `/docs/BRAND.md` |
| 6 | ✅ FIXED | IBM Plex Sans not loaded; Mono used for all body text | `/docs/BRAND.md` |
| 7 | ✅ FIXED | Linear gradients used throughout (should be flat colour) | `/docs/BRAND.md` |
| 8 | ✅ FIXED | Inline styles in evc-fetch.js — border-radius values corrected to 0 | `evc-fetch.js` |
| 9 | ✅ FIXED | "Join the ecological movement" — startup hype | `index.html`, `explore.html` |
| 10 | ✅ FIXED | "Make biodiversity mainstream" — vision statement hype | `about.html` |
| 11 | ✅ FIXED | "In harmony with" — over-spiritualised | `index.html` section-2 |
| 12 | ✅ FIXED | "native" used where "indigenous" is correct | Multiple files |
| 13 | ✅ FIXED | `hasTee === hasKit` hardcoded incorrectly in explore.html — TEES Set added; evc-fetch.js modal pending (see #26) | `/docs/DATA.md` |
| 14 | 🟡 DATA | Kit/tee product data duplicated across two files | `/docs/DATA.md` |
| 15 | 🟠 TECH | Urban EVC fallback uses arbitrary `features[0]` | `/docs/EVC-SYSTEM.md` |
| 16 | 🟠 TECH | Mosaic code mapping undocumented (no source reference) | `/docs/DATA.md` |
| 17 | 🟠 TECH | Plant image tooltips leak into document.body on repeat opens | `evc-fetch.js` |
| 18 | 🟠 TECH | `curated-plants.json` fetched twice per modal in explore.html | `explore.html` |
| 19 | 🟠 TECH | Registry link points to GitHub Pages URL, not production | `evc-fetch.js` |
| 20 | 🟠 TECH | `explore.html` missing from service worker cache | `/docs/PWA.md` |
| 21 | 🟠 TECH | `alert()` used for all errors — blocking, not branded | `evc-fetch.js` |
| 22 | 🟠 TECH | XSS risk: `name` from WFS API inserted via innerHTML | `evc-fetch.js` L838 |
| 23 | 🟠 TECH | `ecological-garden-kit.jpg` unoptimised at 219KB | Root directory |
| 24 | 🔵 INFO | Two DOMContentLoaded listeners in evc-fetch.js | `evc-fetch.js` |
| 25 | 🔵 INFO | Search button resets to "Find My Garden" (was "Find My Ecological Garden") | `evc-fetch.js` |
| 26 | 🟡 DATA | evc-fetch.js modal tee section still uses `hasTee === hasKit` logic — TEES Set not applied here | `evc-fetch.js` |
| 27 | 🟠 TECH | `CACHE_NAME` not incremented after adding `privacy.html` — new file not cached offline | `service-worker.js` |
| 28 | 🟡 DATA | 7 new EVC plant lists are draft stubs — need botanical review before public launch (EVCs 9, 30, 45, 61, 93, 128, 160) | `curated-plants.json` |
| 29 | 🟡 DATA | EVC 160 Coastal Dune Scrub plant list specifically flagged for revision against reference materials | `curated-plants.json` |
| 30 | 🟠 CONTENT | Tee images missing for 5 EVCs: Wet Forest, Shrubby Foothill Forest, Sandstone Ridge Shrubland, Swampy Riparian Complex, Coastal Dune Scrub | `images/tees/` |
| 31 | 🟠 CONTENT | EVC landscape images missing for 4 EVCs: 937 Swampy Woodland, 858 Coastal Alkaline Scrub, 23 Herb-rich Foothill Forest, 29 Damp Forest — falling back to placeholder | `images/evcs/` |

---

## 11. For new developers and AI assistants

### Recommended read order

1. `SUPER_MIND.md` — the G&S operating system. Read once, keep in mind always.
2. `AI_CONTEXT.md` — quick-start companion to SUPER_MIND.
3. This file (`AGENTS.md`) — repo-specific engineering context.
4. The relevant `/docs/` file for the system you're about to change.

### What to know before you start

- This is a single-file static site. No framework, no build step, no npm. What you see is what ships.
- `evc-fetch.js` is the core of the application. It is large and does many things. Read it carefully before changing anything in it.
- `curated-plants.json` is the plant database. Its structure is documented in `/docs/DATA.md`. Do not edit it without reading that file first.
- The WFS API is a third-party Victorian Government service. It is not always reliable. Changes to EVC detection should be tested against multiple Melbourne addresses including inner-city (urban fallback), suburban, and peri-urban.
- The core brand standard is now implemented: border-radius: 0 is enforced, gradients are replaced with flat `#3d4535`, and IBM Plex Sans is loaded for prose. Remaining brand debt: inline styles in `evc-fetch.js` should migrate to CSS classes (see #8 note — values are correct, structure is not). See `/docs/BRAND.md`.
- The two launch blockers (privacy disclosure and Nominatim User-Agent) must be resolved before any public marketing or press coverage of this tool.
