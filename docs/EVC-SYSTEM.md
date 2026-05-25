# EVC-SYSTEM.md — EVC Detection Pipeline

**Repo:** Find My Ecological Garden (`super-barnacle`)
**Last updated:** May 2026

Read this before touching any code in `evc-fetch.js` that relates to address lookup, geolocation, WFS queries, polygon matching, or the urban fallback.

---

## 1. What the system does

Given a street address or GPS coordinate, the EVC detection pipeline identifies which **Ecological Vegetation Class** would have occupied that location before European settlement. It then presents the user with their EVC name, a description, and a curated plant palette.

The pipeline has five stages:

```
User input (address or GPS)
        ↓
  Stage 1: Geocoding
  Nominatim → [lat, lon]
        ↓
  Stage 2: WFS query
  VicGov GeoServer → EVC polygon FeatureCollection
        ↓
  Stage 3: Point-in-polygon
  Turf.js → matched EVC feature (or urban fallback)
        ↓
  Stage 4: Data lookup
  curated-plants.json → description, plant palette
        ↓
  Stage 5: Modal display
  displayModal() → EVC name, map, plants, kit, tee, Registry link
```

Each stage is documented below. Failure in any stage produces a user-facing error or fallback.

---

## 2. Stage 1 — Geocoding (Nominatim)

### Address path

`geocodeAddress(address)` in `evc-fetch.js`

1. Sends address string to `nominatim.openstreetmap.org/search` with `format=json&addressdetails=1`
2. Takes the first result (`results[0]`)
3. Checks the result is in Victoria — inspects `result.address.state` and `result.display_name` for "Victoria" or "VIC"
4. If not Victorian, throws a user-visible error: *"We currently only serve Victoria."*
5. Extracts `[lat, lon]` and passes to `fetchEVCData(lat, lon)`

### GPS path

`locationBtn` click handler in `evc-fetch.js`

1. Calls `navigator.geolocation.getCurrentPosition()`
2. Uses `enableHighAccuracy: false` on iOS (reduces battery drain and timeout failures), `true` on other platforms
3. On success, passes `[lat, lon]` directly to `fetchEVCData(lat, lon)` — no geocoding step
4. On error, produces platform-specific messages (iOS Settings path, generic browser path)

### Autocomplete

`fetchAddressSuggestions(query)` — fires after 300ms debounce on address input

1. Queries Nominatim with the partial address + `, Victoria, Australia` appended
2. Filters results to Victorian residential addresses (requires `house_number`, excludes amenity/shop/office/tourism)
3. Shows up to 5 results in a positioned dropdown
4. Selecting a result calls `selectAddress(result)` which bypasses the geocode step and calls `fetchEVCData` directly

### ⛔ LAUNCH BLOCKER — Nominatim usage policy

Nominatim's [usage policy](https://operations.osmfoundation.org/policies/nominatim/) requires:
- A valid `User-Agent` or `X-Nominatim-App` header identifying the application
- No more than 1 request per second
- No bulk geocoding

The current code sends no `User-Agent` header. For low traffic this is tolerated, but a production app without a valid header can be blocked without notice. Before any marketing or public launch, add a custom header to all Nominatim `fetch()` calls:

```js
fetch(url, {
  headers: {
    'User-Agent': 'FindMyEcologicalGarden/1.0 (www.findmyecologicalgarden.com)'
  }
})
```

This applies to three call sites: `geocodeAddress`, `fetchAddressSuggestions`, and the reverse geocode inside `displayModal`.

---

## 3. Stage 2 — WFS query (VicGov GeoServer)

### Endpoint

```
https://opendata.maps.vic.gov.au/geoserver/wfs
  ?service=WFS
  &version=1.1.0
  &request=GetFeature
  &typeName=open-data-platform:nv2005_evcbcs
  &bbox={bbox}
  &srsName=EPSG:4326
  &outputFormat=application/json
```

**Dataset:** `nv2005_evcbcs` — Native Vegetation 2005, EVC Bioregion Combined Significance. This is the pre-1750 baseline EVC dataset for Victoria.

### Bounding box

A 0.05° buffer (~5.5km radius) is applied around the target point to retrieve all nearby EVC polygons. This is a deliberate compromise:
- Too small: urban areas with dense, small polygons may return nothing
- Too large: CORS errors or response timeouts from the GeoServer

The buffer is set in two functions and must be kept in sync:
- `fetchEVCData` — `bbox = \`${lat - buffer},${lon - buffer},${lat + buffer},${lon + buffer}\``
- `fetchEVCDataLonLat` — `bbox = \`${lon - buffer},${lat - buffer},${lon + buffer},${lat + buffer}\``

### Coordinate order ambiguity

WFS 1.1.0 formally specifies `lat,lon` order in BBOX. The VicGov GeoServer is inconsistent — it sometimes expects `lon,lat`. The code handles this by trying `lat,lon` first, and if zero features are returned, retrying with `lon,lat`:

```
fetchEVCData(lat, lon)           → bbox in lat,lon order
  ↓ (if 0 features returned)
fetchEVCDataLonLat(lat, lon)     → bbox in lon,lat order
  ↓ (if still 0 features)
throw "No EVC data found for this location"
```

This retry logic is not a bug — it is a known workaround for GeoServer behaviour. Do not simplify it away without testing against both urban and regional Victorian addresses.

### API error handling

The GeoServer occasionally returns an XML error document instead of JSON (e.g., service overloaded, bad request). The code checks:

```js
if (txt.trim().startsWith("<"))
  throw new Error("EVC service error. Try again later.");
```

This catches XML responses before `JSON.parse` throws a cryptic error. Do not remove this check.

---

## 4. Stage 3 — Point-in-polygon matching (Turf.js)

`processEVCResults(data, lat, lon)` in `evc-fetch.js`

### Exact match

```js
const point = turf.point([lon, lat]);  // GeoJSON is [lon, lat]

for (let i = 0; i < data.features.length; i++) {
  if (turf.booleanPointInPolygon(point, data.features[i])) {
    matchedFeature = data.features[i];
    break;
  }
}
```

**Important:** GeoJSON coordinates are `[longitude, latitude]`. Turf.js expects GeoJSON. The WFS response features are already in GeoJSON format. The `turf.point([lon, lat])` call is correct — do not swap these.

### Urban fallback

If no feature contains the point (typically because the address is in a heavily urbanised area where the 1750 vegetation layer has no mapped polygon), the code falls back to:

```js
matchedFeature = data.features[0];
isUrbanFallback = true;
```

**This is a known limitation.** `features[0]` is the first feature returned by the WFS query, which is not guaranteed to be the nearest or most relevant polygon. The fallback assigns an EVC that may be geographically unrelated to the address.

The on-screen disclaimer that appears for urban fallbacks is correct behaviour and must remain. The underlying selection logic is a known debt item (#15 in AGENTS.md).

A better approach (not yet implemented): calculate the centroid of each feature polygon and select the feature whose centroid is closest to the target point. This would produce a geographically defensible fallback even where no exact match exists.

### EVC name cleaning

Two transformations are applied to the raw `x_evcname` field from the WFS response:

**Mosaic EVCs** (two communities mapped together with `/`):
```js
if (name.includes('/')) name = name.split('/')[0].trim();
// "Grassy Woodland / Plains Grassy Woodland" → "Grassy Woodland"
```

**Aggregate EVCs** (regional groupings):
```js
if (name.includes('Aggregate')) name = name.replace(/\s+Aggregate$/i, '').trim();
// "Box-Ironbark Forest Aggregate" → "Box-Ironbark Forest"
```

Both transforms run in `processEVCResults` and again at the top of `displayModal` as a safety net. They should be consolidated to one location.

---

## 5. Mosaic code remapping

Some EVC codes in the WFS data represent mosaic or transitional communities that do not have a direct entry in `curated-plants.json`. The code remaps these to a representative single-community code:

```js
const mosaicCodeMapping = { '921': '2', '904': '2', '1': '160' };
```

| WFS code | Maps to | Notes |
|---|---|---|
| `921` | `2` (Grassy Woodland) | Mosaic — source unclear |
| `904` | `2` (Grassy Woodland) | Mosaic — source unclear |
| `1` | `160` | Transitional — source unclear |

**The source of these mappings is undocumented.** They were embedded in the code without explanation. Before adding to or modifying this table, identify the ecological justification for each mapping and record it here. An incorrect remapping assigns users to the wrong plant palette — an ecological integrity issue, not just a data error.

---

## 6. Stage 4 — Data lookup (curated-plants.json)

After the WFS match, the EVC code is used to look up plant data:

```js
const evcInfo = data.evcs[code];
```

Where `code` is the string EVC number (e.g., `"55"` for Plains Grassy Woodland). If `evcInfo` is undefined, the modal shows a "still being curated" message and reveals the email signup section.

The structure of `curated-plants.json` is documented in detail in `/docs/DATA.md`.

---

## 7. URL parameter sharing

Users can share their EVC result via a URL with parameters:

```
https://www.findmyecologicalgarden.com/?evc=55&name=Plains%20Grassy%20Woodland
```

`handleURLParameters()` runs at the top of `DOMContentLoaded`, before any other initialisation:

```js
const evcCode = urlParams.get('evc');
const evcName = urlParams.get('name');

if (evcCode && evcName) {
  displayModal(decodedName, null, null, evcCode, null, null);
  window.history.replaceState({}, document.title, window.location.pathname);
}
```

When opened from a shared link:
- `lat` and `lon` are `null` — the map is hidden, the address line is hidden
- The modal shows the EVC name, description, and plant list without location context
- The URL is cleaned immediately after the modal opens (no double-display on back navigation)

This path is used by the `findmyevc.com` cross-referral domain (if active). The parameters are generated by external sources — the code trusts `evcName` from the URL and inserts it into the DOM via `textContent`, which is safe. Do not change this to `innerHTML`.

---

## 8. Reverse geocoding

After a GPS lookup, the modal needs to display a human-readable address rather than coordinates. A reverse geocode is fired asynchronously after the modal opens:

```js
fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
```

This populates the email signup form's hidden address field (`gf-address`) and is shown in the modal title. The same Nominatim User-Agent requirement applies here.

---

## 9. Known failure modes

| Failure | Cause | Current behaviour | Status |
|---|---|---|---|
| No EVC found | Address outside Victorian polygon coverage | Error thrown, buttons reset | Expected |
| WFS returns XML | GeoServer overloaded or bad request | Caught, generic error shown | Handled |
| Urban address not in any polygon | Pre-1750 data has no urban-area polygons | Fallback to `features[0]` | Known debt (#15) |
| Nominatim rate limit or block | Missing User-Agent, high traffic | Geocode fails silently or returns 429 | ⛔ Launch blocker |
| iOS geolocation denied | User denied permission or Location Services off | Clear iOS-specific message shown | Handled |
| iOS geolocation timeout | Location Services slow on first use | 30s timeout, fallback message | Handled |
| Address not in Victoria | Non-Victorian result returned | User-visible error message | Handled |
| EVC code not in curated-plants.json | EVC exists in WFS but not yet curated | "Being curated" message + email capture | Expected |
