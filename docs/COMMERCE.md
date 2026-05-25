# COMMERCE.md — Commerce Flows

**Repo:** Find My Ecological Garden (`super-barnacle`)
**Last updated:** May 2026

Read this before changing Stripe links, prices, kit or tee availability, or the preorder form.

---

## 1. Overview

The application has three commerce flows:

| Flow | Product | Mechanism | Where |
|---|---|---|---|
| Forest kit purchase | Indigenous planting kit, $89/m² | Stripe payment link | EVC modal (index.html via evc-fetch.js) |
| Ecological tee purchase | EVC-branded hemp tee, $55 | Stripe payment link | EVC modal (index.html via evc-fetch.js) |
| Preorder inquiry | Custom forest kit (large/complex sites) | Google Form | EVC modal preorder button (index.html) |

All three are initiated from the EVC modal after a successful address lookup. There is no shopping cart, no account system, and no server-side commerce logic.

---

## 2. Forest kit — Stripe

### Payment link

```
https://buy.stripe.com/3cI9AT2Y94Srb7f6xN5Vu01
```

This link is hardcoded in `evc-fetch.js` in the kit button click handler. **If the Stripe link changes, update it here and nowhere else** — do not add a second copy anywhere.

### Price

`$89 per m²` plus shipping. Displayed in the modal via inline-built DOM elements. The price string is hardcoded in `evc-fetch.js` and is not read from `curated-plants.json`. If the price changes, update `evc-fetch.js` (the `kitPrice.innerHTML` assignment).

### Client reference ID

A `client_reference_id` parameter is appended to the Stripe URL on purchase. This links the payment to the specific EVC and date so G&S can fulfil the right kit:

```js
const cleanEvcName = name.replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').toLowerCase();
const timestamp = new Date().toISOString().split('T')[0];
const referenceId = `KIT_${cleanEvcName}_EVC-${code}_DATE-${timestamp}`;
// Example: KIT_plains-grassy-woodland_EVC-55_DATE-2026-05-15
```

Stripe passes this ID through to the payment record and webhook. Do not change the format without coordinating with whoever processes kit orders.

### Kit availability

A kit is shown in the modal when `getKitDetails(name)` in `evc-fetch.js` returns a non-null object. The function is keyed by EVC **name** (not code). If the EVC name shown in the modal doesn't exactly match the key in `getKitDetails`, the kit section shows the "coming soon" state even if a kit exists.

When the EVC name displayed is `name` from the WFS response (after cleaning), and the kit is keyed by a slightly different string, this silently fails. Always verify the exact name string that reaches `getKitDetails` when adding a new kit entry.

### "Coming soon" state

If `getKitDetails(name)` returns null, the kit section shows:

> "We don't have a forest kit for **[EVC name]** yet, but we're curating one! In the meantime, explore our other kits to see what's possible with native plantings."

With a button linking to `explore.html`. This is the correct fallback — do not remove it.

---

## 3. Ecological tee — Stripe

### Payment link

```
https://buy.stripe.com/bJe4gzcyJbgP1wF8FV5Vu04
```

Hardcoded in `evc-fetch.js` in the tee button click handler. Same single-source rule applies.

### Price

`$55` plus shipping. Hardcoded in `evc-fetch.js` in the `teePrice.innerHTML` assignment.

### Size selection

A `<select>` element offers XS, S, M, L, XL, XXL. Size is required — clicking "Buy now" without selecting a size triggers `alert("Please choose a size first.")`. Size is included in the `client_reference_id`.

### Client reference ID

```js
const referenceId = `TEE_${cleanEvcName}_SIZE-${size}_EVC-${code}_DATE-${timestamp}`;
// Example: TEE_plains-grassy-woodland_SIZE-M_EVC-55_DATE-2026-05-15
```

### Tee availability

The tee section is shown or hidden based on whether a tee image exists in `images/tees/`. The image filename is derived from the EVC name:

```js
const imageFilename = name.toLowerCase()
  .replace(/\s+/g, '-')
  .replace(/['']/g, '')
  .replace(/&/g, 'and') + '.jpg';
// "Plains Grassy Woodland" → "plains-grassy-woodland.jpg"
```

If `images/tees/plains-grassy-woodland.jpg` exists, the tee section renders fully. If the image fails to load, `onerror` fires and shows a "coming soon" placeholder with an emoji and a holding message.

**This means tee availability is controlled by the presence of an image file, not by a data flag.** To add a tee for an EVC, add the image. To disable a tee, remove or rename the image. There is no boolean to toggle.

This is fragile — see §6 for the consolidation plan.

### Tee product description

The tee copy is hardcoded in the `teeDescription` DOM element in `evc-fetch.js`:

> Koa Goods Classic Hemp Tee — 210 gsm blend of hemp and organic cotton, crafted in carbon-neutral workshops, tree planted per order...

If the supplier, material, or product changes, update this text in `evc-fetch.js`. It is not in a content file.

---

## 4. Preorder modal — Google Form

### What it is

The preorder modal collects enquiry details for large or custom forest kit projects where the standard Stripe kit is not appropriate. It is distinct from the standard kit purchase.

### Form action

```
https://docs.google.com/forms/d/e/1FAIpQLSdzMYnUrg7FuTkNk9_5u2VXV6Ea0LrRWE-_paKu7gFIdz7fWw/formResponse
```

### Fields collected

| Field | Form entry ID | Notes |
|---|---|---|
| Name | `entry.1168713650` | Required |
| Email | `entry.403953874` | Required |
| Phone | `entry.963420574` | Required |
| Property address | `entry.463300287` | Auto-filled from `window.searchedAddress` |
| Approximate area (m²) | `entry.2073002838` | Required |
| EVC | `entry.10172062` | Auto-filled from `window.currentEvcName` |

### Auto-fill behaviour

`openPreorderModal()` pre-fills the address and EVC fields from the global state set by the previous EVC lookup:
- `window.searchedAddress` → address textarea
- `window.currentEvcName` → EVC input (read-only appearance via light grey styling)

If called without a prior lookup (e.g., from a shared link), the address field is left empty and a reverse geocode is attempted if coordinates are available.

### Orphaned function

`openPreorderModal()` is defined in `evc-fetch.js` but the preorder button in `index.html` is not wired to call it. The preorder modal is present in the DOM but is currently unreachable from the UI. This is a known dead end (issue #— not yet numbered in backlog). Before wiring it up, confirm the Google Form is live and monitored.

---

## 5. Email signup — Google Form

The email signup form (shown in the EVC modal footer and on the explore page) is separate from commerce but documented here for completeness.

### Form action

```
https://docs.google.com/forms/d/e/1FAIpQLScQPHZI3_aT51WnDUpszhO03xYKPVJ76r9uiKC6KoZDP8oXYQ/formResponse
```

### Fields

| Field | Form entry ID | Notes |
|---|---|---|
| Address | `entry.1492023911` | Hidden, auto-filled from address lookup or "Explore Page" |
| EVC code | `entry.1435626710` | Hidden, auto-filled (e.g., "EVC 55") |
| Email | `entry.732959100` | User-entered |

The form posts to a hidden iframe (`gf-iframe`) so the page does not redirect. After 500ms, the submit button text changes to "Thanks! Check your email soon." and is disabled.

---

## 6. Commerce data consolidation (pending)

The current state has three separate places that determine what commerce is available for an EVC:

| Data | Location | Mechanism |
|---|---|---|
| Kit details | `getKitDetails()` in `evc-fetch.js` | Hardcoded object keyed by EVC name |
| Kit/tee badge on explore cards | `FOREST_KITS` in `explore.html` | Hardcoded object keyed by EVC name |
| Tee availability in modal | `images/tees/` directory | Presence of image file |

This should be consolidated into `curated-plants.json` with `kit` and `tee` objects per EVC. See `/docs/DATA.md §3` for the proposed schema. Until that work is done, any addition or change to commerce availability requires updates in all three places.

---

## 7. If Stripe links change

1. Open `evc-fetch.js`
2. Search for `buy.stripe.com`
3. Update the kit URL (one occurrence) and the tee URL (one occurrence)
4. Test both purchase flows end-to-end before committing
5. Record the change in `/docs/DECISIONS-LOG.md` with the date and reason

Do not store old Stripe URLs in comments — delete them cleanly.

---

## 8. If prices change

1. Open `evc-fetch.js`
2. Search for `$89` and `$55`
3. Update the `innerHTML` strings in the `kitPrice` and `teePrice` DOM assignments
4. Update any references in `AGENTS.md` §6 (current state) if the price affects the product description
5. Record in `/docs/DECISIONS-LOG.md`
