# LAUNCH-CHECKLIST.md — Pre-Launch Verification

**Repo:** Find My Ecological Garden (`super-barnacle`)
**Last updated:** May 2026

This checklist must be completed before any public marketing, press coverage, social media promotion, or significant increase in traffic to `www.findmyecologicalgarden.com`.

Items marked **⛔ BLOCKER** must be resolved before launch. Items marked **🟡 IMPORTANT** should be resolved before launch but are not technically blocking.

---

## How to use this checklist

Work through each section in order. For each item:
- Check it manually against the live site (not just the code)
- Mark it complete only when verified, not when the code change is committed
- If an item cannot be completed, document why before proceeding

---

## Section 1 — Legal and Privacy ⛔

### 1.1 Privacy disclosure — EVC lookup log
- [ ] A disclosure notice is visible to the user before or during address entry, explaining that their address and EVC result will be recorded
- [ ] The notice uses plain language (no legal jargon)
- [ ] The notice links to a privacy policy
- [ ] **Suggested copy:** *"We use your address to identify your EVC. We also record which EVCs are being searched across Victoria to understand where ecological gardens are growing."*
- [ ] Verified on desktop and mobile

### 1.2 Privacy disclosure — email signup
- [ ] The email signup form clearly states that address and EVC data will be included alongside the email
- [ ] **Suggested copy near submit button:** *"We'll include your address and EVC so we can send you relevant updates for your area."*

### 1.3 Privacy policy
- [ ] A privacy policy exists (can be on gardenerandson.com)
- [ ] The policy covers: what is collected, why, who it is shared with (Google Forms/Sheets, Stripe), retention period, deletion request process
- [ ] A link to the privacy policy is in the application footer on all pages

### 1.4 Nominatim User-Agent header
- [ ] All three Nominatim `fetch()` calls include a valid `User-Agent` header:
  - `geocodeAddress()` (address search)
  - `fetchAddressSuggestions()` (autocomplete)
  - Reverse geocode inside `displayModal()` (GPS path)
- [ ] **Required header:** `'User-Agent': 'FindMyEcologicalGarden/1.0 (www.findmyecologicalgarden.com)'`
- [ ] Verified by inspecting Network requests in browser DevTools

---

## Section 2 — Technical ⛔

### 2.1 Service worker BASE_PATH
- [ ] `service-worker.js` `BASE_PATH` is `''` (empty string) for the custom domain deployment
- [ ] `CACHE_NAME` has been incremented from `ecological-garden-v1`
- [ ] Verified: open DevTools → Application → Service Workers — service worker shows as "Activated and running"
- [ ] Verified: DevTools → Application → Cache Storage — cached files show paths without `/super-barnacle/` prefix
- [ ] Verified: Network tab with throttling → Offline — `index.html` loads from cache

### 2.2 Email links
- [ ] Email address links in `about.html` and `contact.html` work correctly
- [ ] The email button in `contact.html` (`Send Us an Email`) links to a functioning `mailto:` or direct email, not a Cloudflare-obfuscated URL
- [ ] Verified by clicking on a device without Cloudflare (e.g., directly from GitHub Pages or the custom domain)

### 2.3 EVC detection — core flow
- [ ] Address search works for a Melbourne suburban address (e.g., 2 Churchill Street Mont Albert)
- [ ] Address search correctly rejects a non-Victorian address (e.g., a Sydney address)
- [ ] GPS geolocation works on mobile (HTTPS required — must test on `www.findmyecologicalgarden.com`, not `localhost`)
- [ ] Address autocomplete returns results and selecting one triggers an EVC lookup
- [ ] EVC modal opens and displays: EVC name, description, plant list (if available), kit section, tee section
- [ ] Urban fallback disclaimer appears for an inner-city Melbourne address

### 2.4 EVC detection — edge cases
- [ ] An EVC with no plant list shows "being curated" message and email capture
- [ ] A shared link (`?evc=55&name=Plains+Grassy+Woodland`) opens the modal without an address
- [ ] Closing the modal and searching again works correctly (no stale state)

### 2.5 Commerce flows
- [ ] Kit "Buy Your Garden Kit" button opens Stripe in a new tab
- [ ] The Stripe URL includes a correct `client_reference_id` (inspect in browser before clicking)
- [ ] Tee "Buy now" button requires a size selection before proceeding
- [ ] Tee "Buy now" button opens Stripe in a new tab with correct `client_reference_id` including size
- [ ] An EVC without a kit shows the "coming soon" state and Explore button
- [ ] An EVC without a tee image shows the "coming soon" placeholder

### 2.6 Explore page
- [ ] All EVC cards load from `curated-plants.json`
- [ ] Filter chips (Habitat, Moisture, Products) filter cards correctly
- [ ] Text search filters by name and description
- [ ] Clear All resets all filters
- [ ] Clicking "View Details" opens the EVC modal
- [ ] EVC modal on explore page shows plant list (no map, no address line — correct)

### 2.7 Secondary pages
- [ ] `about.html` loads and all links work
- [ ] `contact.html` loads and all links work (including the repaired email link from 2.2)
- [ ] Back button on both pages returns to `index.html`

---

## Section 3 — PWA 🟡

### 3.1 iOS install
- [ ] Opening `www.findmyecologicalgarden.com` in Safari on iPhone
- [ ] "Add to Home Screen" from the share sheet installs the app
- [ ] Installed app opens in standalone mode (no Safari UI)
- [ ] App name on home screen is "Eco Garden" (or updated `short_name` from manifest)
- [ ] App icon is the correct G&S icon

### 3.2 Android install
- [ ] Opening `www.findmyecologicalgarden.com` in Chrome on Android
- [ ] Install prompt appears (or "Add to Home Screen" from menu works)
- [ ] Installed app opens correctly

### 3.3 Offline behaviour
- [ ] Previously visited pages load when offline (DevTools → Network → Offline)
- [ ] Offline EVC lookup shows a clear error (not a blank screen)
- [ ] `explore.html` is cached and loads offline

---

## Section 4 — Brand 🟡

### 4.1 Typography
- [ ] IBM Plex Sans is loaded in all four HTML files
- [ ] Body text renders in IBM Plex Sans (verify in DevTools → Elements → Computed styles)
- [ ] EVC codes, coordinates, and form inputs render in IBM Plex Mono
- [ ] Abril Fatface renders for EVC names, page titles, section headers

### 4.2 Colours
- [ ] Background is `#fff0dc` (Nostalgic Beige)
- [ ] Primary colour is `#3d4535` (Gardener Green)
- [ ] No gradients visible on buttons, cards, or backgrounds

### 4.3 Border radius
- [ ] All buttons are square (border-radius: 0)
- [ ] Modal container is square (border-radius: 0)
- [ ] Cards are square (border-radius: 0)
- [ ] Inputs are square (border-radius: 0)

### 4.4 Voice
- [ ] Section 2 of index.html — "harmony with" replaced with ecologically grounded phrasing
- [ ] "Join the ecological movement" replaced in index.html and explore.html
- [ ] "Make biodiversity mainstream" removed or replaced in about.html
- [ ] "native wildlife" → "local wildlife" in index.html section 2
- [ ] "native plant selections" → "indigenous plant selections" in contact.html

---

## Section 5 — Analytics and logging 🟡

### 5.1 EVC lookup log
- [ ] After an address search, a new row appears in the Google Sheets response sheet within ~30 seconds
- [ ] The row contains: address, latitude, longitude, EVC code, EVC name
- [ ] Form ID and entry IDs are still correct (Google Forms occasionally changes these)

### 5.2 Email signup
- [ ] Submitting the email form in the modal creates a new response in the signup sheet
- [ ] The submit button changes to "Thanks! Check your email soon." after submission
- [ ] Duplicate emails are not deduplicated at this layer (known limitation — manual deduplication in Sheets)

### 5.3 Google Forms accessibility
- [ ] Both Google Forms are accessible to the G&S Google account
- [ ] Response notifications are set up (email alerts for new responses, at minimum for preorders)

---

## Section 6 — Content 🟡

### 6.1 Plant data
- [ ] JSON validates (paste `curated-plants.json` into a JSON validator)
- [ ] At least 10 EVCs have complete plant lists (canopy, shrub, ground layer)
- [ ] No plant names appear in both scientific and common-name-only form inconsistently (convention: `Genus species (Common Name)`)

### 6.2 Images
- [ ] All EVC cards in `explore.html` show their EVC image (or a known, intentional placeholder)
- [ ] Plant images load correctly on hover for at least the most common EVCs
- [ ] `ecological-garden-kit.jpg` (fallback kit image) is compressed to under 100KB

### 6.3 Contact details
- [ ] Studio address is current (2 Churchill Street, Mont Albert 3127)
- [ ] Phone number is current
- [ ] Email address resolves correctly

---

## Section 7 — Cross-property links 🟡

### 7.1 Registry link
- [ ] The Registry link inside the EVC modal points to the production Registry URL (not `tinyforests.github.io/reg/`)
- [ ] Clicking the link opens the Registry in a new tab
- [ ] The Registry is live and accessible at the linked URL

### 7.2 G&S brand badge
- [ ] The "Gardener & Son" badge on all pages links to `https://www.gardenerandson.com`
- [ ] `gardenerandson.com` is live and resolves correctly

### 7.3 Spine coherence
- [ ] After discovering their EVC, a user has a clear path to:
  - Purchase a planting kit (Commerce)
  - Register their garden once planted (Registry)
  - Stay connected via email (ongoing relationship)
- [ ] None of these paths are broken

---

## Sign-off

Complete this section when all blocking items are checked and the majority of important items are checked.

| | |
|---|---|
| Reviewed by | |
| Date | |
| Launch blockers resolved | ⛔ 1.1 / 1.2 / 1.3 / 1.4 / 2.1 / 2.2 |
| Known remaining issues | |
| Notes | |
