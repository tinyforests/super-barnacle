# DATA.md — Plant Data and EVC Naming

**Repo:** Find My Ecological Garden (`super-barnacle`)
**Last updated:** May 2026

Read this before editing `curated-plants.json`, adding new EVCs, changing the EVC name resolution logic, or modifying the kit or tee product lists.

---

## 1. curated-plants.json — overview

`curated-plants.json` (61KB) is the primary data file for the application. It is loaded client-side on every modal open. It contains:

- All EVC records served by the application
- EVC descriptions (ecological prose, one paragraph per EVC)
- Curated plant palettes, grouped by vegetation layer
- EVC common names (where the WFS field is unreliable)

It is a static file — there is no CMS, no database, no API. To add or edit plant data, edit this file directly.

### Top-level structure

```json
{
  "evcs": {
    "2": { ... },
    "3": { ... },
    "55": { ... }
  }
}
```

Keys are EVC code strings (the numeric EVC identifier as a string, matching the `evc` field in the VicGov WFS response).

### Per-EVC structure

```json
"55": {
  "name": "Plains Grassy Woodland",
  "description": "Plains Grassy Woodland occupies...",
  "recommendations": [
    {
      "layer": "Canopy",
      "plants": [
        "Eucalyptus camaldulensis (River Red Gum)",
        "Eucalyptus melliodora (Yellow Box)"
      ]
    },
    {
      "layer": "Shrub Layer",
      "plants": [
        "Acacia pycnantha (Golden Wattle)"
      ]
    },
    {
      "layer": "Ground Layer",
      "plants": [
        "Themeda triandra (Kangaroo Grass)",
        "Microlaena stipoides (Weeping Grass)"
      ]
    }
  ]
}
```

### Field definitions

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | string | Recommended | The display name for this EVC. Used if the WFS field is unreliable or absent. |
| `description` | string | Required | One paragraph of ecological prose. See §4 for voice guidelines. |
| `recommendations` | array | Required for plant display | If absent or empty, the "being curated" message and email capture are shown instead. |
| `recommendations[].layer` | string | Required | Vegetation layer heading. Use: "Canopy", "Shrub Layer", "Ground Layer". |
| `recommendations[].plants` | array of strings | Required | Plant names. Convention: `Genus species (Common Name)`. |

---

## 2. EVC name resolution

EVC names shown to users are resolved from multiple sources in priority order. The logic lives in `getEvcName()` in `explore.html` and as inline handling in `evc-fetch.js` (`processEVCResults`).

### Resolution order

```
1. Manual override table (manualNames in explore.html)
2. name field in curated-plants.json
3. Pattern-matched from description field ("X is a/grows/occurs...")
4. Fallback: "EVC {code}"
```

### Manual name overrides

These exist in `explore.html` because certain WFS `x_evcname` values are unreliable, blank, or return aggregate/mosaic names that don't match `curated-plants.json` keys.

| Code | Override name | Reason |
|---|---|---|
| `3` | Damp Sands Herb-rich Woodland | WFS name unreliable |
| `6` | Sand Heathland | WFS name unreliable |
| `8` | Wet Heathland | WFS name unreliable |
| `21` | Shrubby Dry Forest | WFS name unreliable |
| `23` | Herb-rich Foothill Forest | WFS name unreliable |
| `29` | Damp Forest | WFS name unreliable |
| `55` | Plains Grassy Woodland | WFS name unreliable |
| `172` | Floodplain Wetland | WFS name unreliable |
| `858` | Coastal Alkaline Scrub | WFS name unreliable |
| `937` | Swampy Woodland | WFS name unreliable |

**Maintenance rule:** If you add a new EVC to `curated-plants.json` and the WFS `x_evcname` for that code is incorrect or inconsistent, add an entry to this table. The `name` field in `curated-plants.json` is used as the fallback when the WFS response is processed — keep both in sync.

### Name cleaning (applied in evc-fetch.js)

Before name resolution, two transformations strip artefacts from the raw WFS field:

```
"Grassy Woodland / Plains Grassy Woodland" → "Grassy Woodland"   (mosaic, split on /)
"Box-Ironbark Forest Aggregate"            → "Box-Ironbark Forest"  (strip "Aggregate")
```

These run in `processEVCResults()` and again at the top of `displayModal()`. The duplication is known debt — the transforms should live in one place.

---

## 3. Product data — architectural debt

**This is the single most important structural issue in the codebase.** Kit and tee product data is duplicated across two locations that are manually kept in sync:

### Location A — `getKitDetails()` in `evc-fetch.js`

Used by the main app modal (`index.html`). Contains for each EVC:
- `image` (filename)
- `description` (kit prose)
- `canopy`, `shrub`, `groundcover` (plant counts)
- `specialFeature` (one-line differentiator)
- `slug` (URL-safe name)

### Location B — `FOREST_KITS` in `explore.html`

Used by the EVC browser grid. Contains for each EVC:
- `available` (boolean)
- `slug`

These two objects cover different but overlapping EVCs. When a kit is added, both must be updated. When an EVC name changes, both must be updated. This will produce silent inconsistencies — a user sees a "Kit Available" badge on the explore page but no kit in the modal, or vice versa.

### The fix (not yet implemented)

Move all product data into `curated-plants.json` as additional fields per EVC:

```json
"55": {
  "name": "Plains Grassy Woodland",
  "description": "...",
  "kit": {
    "available": true,
    "image": "plains-grassy-woodland.jpg",
    "description": "...",
    "canopy": 3,
    "shrub": 2,
    "groundcover": 5,
    "specialFeature": "Drought-tolerant species mix",
    "slug": "plains-grassy-woodland"
  },
  "tee": {
    "available": true,
    "image": "plains-grassy-woodland.jpg"
  },
  "recommendations": [ ... ]
}
```

Both `evc-fetch.js` and `explore.html` would then read from the same source. Until this is implemented, **any kit or tee addition requires updates in both files**.

### hasTee === hasKit (known error)

In `explore.html`, the tee availability badge is currently derived from the kit availability:

```js
hasTee: FOREST_KITS[name]?.available || false // Assuming tees match kits for now
```

This is incorrect and acknowledged in the code comment. Tees and kits are separate product lines. An EVC may have a tee but no kit, or a kit but no tee. Until product data is consolidated into `curated-plants.json` with separate `kit` and `tee` fields, the tee badge on explore cards is unreliable.

---

## 4. How to add a new EVC

Follow these steps in order. Skipping a step will cause silent failures.

### Step 1 — Add to curated-plants.json

Add an entry under `evcs` using the EVC code as the key (string):

```json
"42": {
  "name": "Your EVC Name",
  "description": "One ecological paragraph. Present tense. Specific. No hype. See voice guidelines below.",
  "recommendations": [
    {
      "layer": "Canopy",
      "plants": ["Eucalyptus sp. (Common Name)"]
    },
    {
      "layer": "Shrub Layer",
      "plants": ["Acacia sp. (Common Name)"]
    },
    {
      "layer": "Ground Layer",
      "plants": ["Species (Common Name)"]
    }
  ]
}
```

Plant name convention: `Genus species (Common Name)`. If there is no accepted common name, use the scientific name alone. Do not invent common names.

### Step 2 — Check WFS name reliability

Search the VicGov WFS for EVC code 42 and check the `x_evcname` field. If it is blank, incorrect, or returns a mosaic/aggregate name that doesn't match your entry, add it to the manual override table in `explore.html` (see §2 above).

### Step 3 — Add kit details (if kit available)

In `getKitDetails()` in `evc-fetch.js`, add an entry keyed by EVC name (not code):

```js
'Your EVC Name': {
  image: 'your-evc-name.jpg',
  description: 'Kit description.',
  canopy: 2, shrub: 4, groundcover: 4,
  specialFeature: 'One differentiating feature',
  slug: 'your-evc-name'
}
```

Also add to `FOREST_KITS` in `explore.html`:

```js
'Your EVC Name': { available: true, slug: 'your-evc-name' }
```

Both must be updated. This is the duplication debt — see §3.

### Step 4 — Add images

- `images/evcs/your-evc-name.jpg` — landscape/habitat photo for the card and kit display
- `images/tees/your-evc-name.jpg` — tee product photo (if tee available)
- Plant images in `images/plants/` are optional — only needed if you want hover previews. Filename is the common name in lowercase with hyphens.

### Step 5 — Test

Search for a Victorian address known to be in this EVC. Verify:
- EVC name displays correctly
- Description loads
- Plant list appears by layer
- Kit section shows (if added) or "coming soon" state if not
- No console errors

---

## 5. Description voice guidelines

EVC descriptions in `curated-plants.json` are public-facing prose. They must follow G&S voice standards.

**Use:**
- Present tense: "Plains Grassy Woodland occupies flat to gently undulating terrain..."
- Ecological specifics: soil type, moisture regime, dominant species, associated fauna
- "Indigenous" not "native"
- Layered structure language: canopy, shrub layer, groundcover, ground layer

**Avoid:**
- "Stunning", "beautiful", "amazing", "unique" — decorative adjectives
- "Sustainable", "eco-friendly", "green" — generic sustainability language
- "Harmony with" — over-spiritualised framing
- Future tense or aspiration: "will restore", "can transform"
- Reference to Gardener & Son in the description — the description is about the EVC, not the studio

**Example of wrong tone:**
> "This stunning woodland community is a beautiful haven for wildlife and will transform your garden into a sustainable ecosystem."

**Example of right tone:**
> "Plains Grassy Woodland occupies flat to gently undulating terrain on fertile soils of the Victorian Volcanic Plains. Dominated by River Red Gum and Yellow Box with an open, grassy groundlayer of Kangaroo Grass and native lilies. One of the most heavily modified EVCs in Victoria — fewer than 2% of original extent remains outside remnant bushland reserves."

---

## 6. Plant image convention

Plant hover-preview images live in `images/plants/`. The filename is derived from the plant name in the `recommendations` array.

The matching logic in `checkPlantImage()` in `evc-fetch.js`:

```js
// If name contains "(Common Name)", use just the common name
const commonNameMatch = plantName.match(/\(([^)]+)\)/);
if (commonNameMatch) nameForImage = commonNameMatch[1].trim();

// Convert to filename
const imageName = nameForImage.toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/['']/g, '');
// → "river-red-gum.jpg"
```

So `Eucalyptus camaldulensis (River Red Gum)` → `river-red-gum.jpg`.

If no image is found, the camera icon is simply not shown — the plant item still displays. No fallback image is used for plants.

---

## 7. curated-plants.json maintenance

- **Do not minify** this file. It is human-edited and must remain readable.
- **Validate JSON** after any edit before committing. An invalid JSON file breaks every modal in the application.
- **Do not add fields** not documented in §1 without updating this file and both the modal rendering code and the explore page.
- The file is cached by the service worker (once the PWA bug is fixed — see `/docs/PWA.md`). After a significant update, consider incrementing the service worker `CACHE_NAME` to force a refresh.
