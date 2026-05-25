# DECISIONS-LOG.md — Architectural Decisions

**Repo:** Find My Ecological Garden (`super-barnacle`)
**Last updated:** May 2026

This file records significant decisions about how the application is built and why. When you make a decision that shapes the architecture, add an entry here. Future contributors — human and AI — should be able to read this log and understand why the code is the way it is, without having to reverse-engineer intent from the code itself.

Decisions that turned out to be wrong are worth recording too. Knowing why something was tried and abandoned prevents re-trying it.

---

## Format

```
## DEC-NNN — Title
Date: YYYY-MM-DD
Status: Active | Superseded by DEC-NNN | Reverted

### Decision
One paragraph. What was decided.

### Context
Why this decision was needed. What problem it solved.

### Consequences
What this decision made easier, and what it made harder.

### Alternatives considered
What else was on the table and why it wasn't chosen.
```

---

## DEC-001 — Pure static HTML with no build process

**Date:** Pre-2026 (origin decision)
**Status:** Active

### Decision

The application is built as plain HTML, CSS, and JavaScript files with no bundler, transpiler, framework, or build step. Deployment is a git push.

### Context

The primary operator (Tyson, G&S co-founder) edits these files directly and needs to be able to make small content changes — a new plant name, a description update, a price change — without a development environment. A build process would create a barrier to that kind of lightweight stewardship.

### Consequences

- **Easier:** Fast iteration. Any change is live in ~30 seconds. No local tooling required. No `node_modules`, no lockfile conflicts, no CI pipeline.
- **Harder:** Code cannot be modularised easily. `evc-fetch.js` has grown large because there is no import/export. Shared CSS cannot be extracted to a single file without either duplicating it or adding a build step.
- **Watch:** As the file sizes grow, load time becomes a concern. At present, `evc-fetch.js` (58KB) and `curated-plants.json` (61KB) are the largest files. Both are acceptable without bundling at current scale.

### Alternatives considered

- **Vite + vanilla JS:** Would enable module splitting and tree-shaking but requires a build step and `npm`. Ruled out to preserve direct-edit simplicity.
- **Next.js or Astro:** Framework overhead not justified for a static site of this size. Server-side rendering provides no benefit when the primary dynamic content (EVC lookup) is entirely client-side.

---

## DEC-002 — VicGov WFS API queried directly from the browser

**Date:** Pre-2026 (origin decision)
**Status:** Active

### Decision

EVC polygon data is fetched directly from the Victorian Government GeoServer WFS endpoint from the client browser. There is no server-side proxy.

### Context

The VicGov WFS API is a public, open-data endpoint. No API key is required. A direct client-side fetch avoids the need for any backend infrastructure.

### Consequences

- **Easier:** No backend to build, deploy, or maintain. No API key management. The app works without a server.
- **Harder:** CORS headers on the GeoServer are permissive for GET requests but the endpoint is occasionally unreliable (returns XML errors). The coordinate-order ambiguity (lat/lon vs lon/lat) must be handled in client code with a fallback retry. Rate limiting or IP blocking could affect users without warning.
- **Risk:** If VicGov restricts CORS access or takes the endpoint offline, the core function of the application breaks entirely. There is no cached fallback for EVC polygons.

### Alternatives considered

- **Server-side proxy:** Would allow caching WFS responses, handling errors gracefully, and abstracting coordinate-order issues. Adds infrastructure cost and maintenance. Ruled out at MVP stage.
- **Pre-generated EVC boundary GeoJSON:** Download and bundle all Victorian EVC polygons. File size would be prohibitive (~500MB+ for the full dataset). Ruled out.
- **Tile-based approach (vector tiles):** More scalable long-term but significantly more complex to implement. Not appropriate for current scale.

---

## DEC-003 — curated-plants.json as local data file

**Date:** Pre-2026 (origin decision)
**Status:** Active

### Decision

All plant palette data, EVC descriptions, and product associations are stored in a single JSON file (`curated-plants.json`) served as a static asset alongside the HTML.

### Context

At the scale of ~25 curated EVCs, a database is unnecessary overhead. The data changes infrequently (new EVCs added, plant lists updated). A static JSON file is editable by anyone with text editor access, versioned by git, and served instantly from cache.

### Consequences

- **Easier:** No database, no CMS, no API. Data is in git history — every change is traceable. Extremely fast to load (61KB, cached by service worker after fix).
- **Harder:** Edits require a git commit and push. No web UI for data entry. A JSON syntax error in the file breaks every modal in the application (no graceful per-EVC fallback).
- **Watch:** As the EVC count grows beyond ~50 entries, the file will grow proportionally. The full Victorian EVC set is ~600 communities. A database would become appropriate at that scale.

### Alternatives considered

- **Supabase / PostgreSQL:** Appropriate at scale but adds backend dependency, authentication concerns, and RLS policy maintenance. Ruled out for MVP.
- **Contentful or similar CMS:** Adds cost, external dependency, and API key management. Ruled out.
- **Multiple JSON files (one per EVC):** Would allow lazy loading but complicates the fetch logic and adds many more HTTP requests. Ruled out.

---

## DEC-004 — Turf.js for point-in-polygon (not WFS CQL filter)

**Date:** Pre-2026 (origin decision)
**Status:** Active

### Decision

Rather than using a WFS CQL spatial filter to request only the polygon containing the user's point, the code requests all polygons within a bounding box and performs point-in-polygon matching client-side using Turf.js.

### Context

The WFS endpoint supports CQL filters (`CQL_FILTER=CONTAINS(geometry, POINT(lon lat))`), which would return only the matching feature and reduce response size. However, the VicGov GeoServer's handling of CQL spatial filters proved unreliable during initial development — results were inconsistent, and some valid addresses returned empty results.

### Consequences

- **Easier:** Bbox + client-side matching is predictable and debuggable. The urban fallback (nearest feature) is possible because all nearby features are available client-side.
- **Harder:** Larger WFS response (all polygons in a ~5.5km radius, potentially 20-100 features). Client-side processing of GeoJSON polygon geometries. The 0.05° buffer is a tuned compromise — too small returns nothing for urban addresses, too large causes CORS timeouts.
- **Acceptable:** Turf.js is a well-maintained library. `booleanPointInPolygon` is fast for the polygon sizes involved.

### Alternatives considered

- **WFS CQL filter:** Tried and found unreliable on the VicGov GeoServer. May be worth retrying with WFS 2.0 syntax.
- **WMS GetFeatureInfo:** An alternative protocol for point queries on WMS layers. Not attempted.

---

## DEC-005 — Google Forms for data collection (no backend)

**Date:** Pre-2026 (origin decision)
**Status:** Active — but see Privacy implications in `/docs/PRIVACY.md`

### Decision

EVC lookup logging, email signups, and preorder inquiries are all collected via Google Forms POSTed to hidden iframes. No backend server, database, or API is involved.

### Context

At MVP stage, Google Forms provides a zero-cost, zero-infrastructure data collection mechanism. The response data lands in Google Sheets and is immediately accessible without any server setup.

### Consequences

- **Easier:** No backend. No database. Instant setup. Data is accessible in a familiar spreadsheet interface.
- **Harder:** No programmatic access to the data from the application. No ability to de-duplicate, validate, or act on submissions in real-time. No audit log. Privacy disclosure obligations are harder to meet (see `/docs/PRIVACY.md`).
- **Watch:** The lookup log collects personal information (address + coordinates) with no user disclosure. This is a launch blocker. Google's data processing terms also apply to all collected data.

### Alternatives considered

- **Supabase:** Would allow real-time querying and RLS. More appropriate once the tool scales or if analytics queries become important.
- **Airtable:** Similar to Google Forms but with better API access. Adds cost.
- **No logging:** Would remove the privacy risk but also remove the intelligence about which EVCs are being looked up across Victoria — valuable data for understanding where ecological garden activity is happening.

---

## DEC-006 — Stripe payment links (not embedded checkout)

**Date:** Pre-2026 (origin decision)
**Status:** Active

### Decision

Kit and tee purchases redirect to Stripe-hosted payment links opened in a new tab, rather than embedding Stripe's checkout or Elements within the application.

### Context

Payment links are the simplest Stripe integration — no API keys in client code, no webhook handling, no server required. The `client_reference_id` parameter is appended to the URL to associate the payment with the specific EVC and product.

### Consequences

- **Easier:** No Stripe API key exposed in client code. No webhook server to build or maintain. Stripe handles PCI compliance entirely. Setup is near-zero.
- **Harder:** No post-payment confirmation in the application UI. The user is taken out of the application to complete payment. `client_reference_id` is visible in the URL, though this contains no personal information.
- **Watch:** Stripe payment links cannot be customised to the same extent as embedded checkout. If a branded checkout experience is required in future, migration to Stripe Elements would be necessary.

### Alternatives considered

- **Stripe Elements:** Embeds the payment form within the page. More work, requires API key handling, but provides a seamless experience. Appropriate if conversion rates on the current flow are low.
- **WooCommerce / Shopify:** E-commerce platforms. Overkill for two products at current volume.

---

## DEC-007 — Two coordinate-order fetch functions (not one parameterised function)

**Date:** Pre-2026 (origin decision)
**Status:** Active — known debt, should be refactored

### Decision

Rather than one `fetchEVCData(lat, lon, coordinateOrder)` function, the code has two separate functions: `fetchEVCData` (lat/lon bbox order) and `fetchEVCDataLonLat` (lon/lat bbox order). The first calls the second as a fallback.

### Context

The coordinate-order retry was added iteratively when the lat/lon order proved unreliable. The simplest fix at the time was a second function rather than refactoring the original.

### Consequences

- **Worse than the alternative:** The two functions are almost identical — the only difference is the bbox parameter construction. Any change to the fetch logic must be made in both places. This is technical debt.
- **Refactor target:** Combine into one function with a `coordinateOrder` parameter, or use a loop over both orderings.

### Alternatives considered

Not applicable — this was an expedient implementation choice, not a deliberate architectural decision. It should be refactored when `evc-fetch.js` is next significantly modified.
