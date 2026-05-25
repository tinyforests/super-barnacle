# PRIVACY.md — Data Collection and Disclosure

**Repo:** Find My Ecological Garden (`super-barnacle`)
**Last updated:** May 2026

Read this before adding any new data capture, changing how lookups are logged, or preparing for any public launch or marketing activity.

---

## ⛔ LAUNCH BLOCKER

**The application currently collects personal information — including precise GPS coordinates — without any disclosure to the user. This must be resolved before any marketing, press coverage, or significant increase in traffic.**

Australian Privacy Principle 5 (APP 5) requires that organisations collecting personal information take reasonable steps to notify individuals of: what information is collected, why it is collected, and who it may be disclosed to. Location data is personal information under the Australian Privacy Act 1988.

---

## 1. What data is collected

### A — EVC lookup log (every search)

**Trigger:** Every successful EVC lookup (address or GPS), fired inside `logEVCLookup()` in `evc-fetch.js`

**Collected:**
- Street address or display name (from Nominatim `display_name`)
- Latitude (6 decimal places — approximately 10cm precision)
- Longitude (6 decimal places)
- EVC code
- EVC name

**Destination:** Google Form via hidden `<form>` POST to a Google Sheets-backed response sheet

**User visibility:** None. The POST is invisible — no confirmation, no notice, no opt-out. A hidden `<iframe>` (`log-iframe`) absorbs the response.

**Retention:** Google Forms retains responses indefinitely unless manually deleted.

---

### B — Email signup (user-initiated)

**Trigger:** User submits the email form in the EVC modal or on the explore page

**Collected:**
- Email address
- Street address (from previous lookup — auto-populated into a hidden field)
- EVC code

**Destination:** Google Form (different form from the lookup log)

**User visibility:** The email input is visible. The address and EVC code pre-fill is not disclosed — the form visually shows only the email field.

---

### C — Preorder inquiry (user-initiated, currently unreachable from UI)

**Trigger:** Preorder form submission

**Collected:**
- Name
- Email
- Phone number
- Property address
- Approximate area
- EVC

**Destination:** Google Form

**User visibility:** All fields are visible in the preorder modal. This collection is proportionate and expected.

---

### D — Reverse geocode (GPS lookups only)

**Trigger:** After a successful GPS-based EVC lookup, to populate the email form's hidden address field

**Data sent to Nominatim:** Latitude and longitude

**Data returned:** Full street address

**Nominatim's privacy posture:** Nominatim processes requests on OSM Foundation infrastructure. Queries are logged for abuse monitoring. See Nominatim's own privacy documentation.

---

## 2. What must be disclosed

The minimum disclosure required before launch, for each collection point:

### For the lookup log (Collection A)

This is the most significant gap. The user has no idea their address and coordinates are being stored. Required before launch:

**Option 1 — Inline notice under the search input:**

> We use your address to find your EVC. We also record which EVCs are looked up to understand where ecological gardens are being created across Victoria. No personal account is created. [Privacy policy link]

**Option 2 — Modal footer notice (less prominent):**

A small line in the modal, below the address display:

> Your address was used to identify this EVC and has been recorded anonymously to help us map ecological garden activity across Victoria.

Note: "anonymously" is not fully accurate if the full address is stored — use "privately" or omit the qualifier and link to a privacy policy.

**Minimum viable disclosure:** A one-sentence note near the address input before the search is submitted. The user should know before they type, not after.

---

### For the email signup (Collection B)

The hidden pre-fill of address and EVC code into the signup form should be disclosed. Add a line near the submit button:

> We'll include your address and EVC so we can send you relevant updates for your area.

---

### For the preorder (Collection C)

No change needed — the collected fields are visible and proportionate.

---

## 3. Privacy policy

There is currently no privacy policy linked from the application. A minimal privacy policy covering this application should address:

- What personal information is collected (address, coordinates, email, phone for preorders)
- Why it is collected (EVC mapping intelligence, product fulfilment, email communications)
- Who it is shared with (Google Forms/Sheets, Stripe for payment processing)
- How long it is retained
- How to request deletion

The privacy policy can be hosted on `gardenerandson.com` and linked from the footer of this application. It does not need to be a separate page within this repo.

---

## 4. Nominatim usage policy

Beyond the User-Agent header requirement (documented in `/docs/EVC-SYSTEM.md`), Nominatim's usage policy has privacy implications:

- Nominatim logs all requests for abuse detection purposes
- This means every address search by a user of this application is transmitted to OSM Foundation servers
- This is standard practice for geocoding services but should be noted in the privacy policy

The Nominatim terms do not require user consent for this logging, but the privacy policy should mention that address geocoding is performed via OpenStreetMap's Nominatim service.

---

## 5. Google Forms as a data backend

Google Forms is used as a no-backend data collection mechanism. Implications:

- Response data lives in Google Sheets, accessible to anyone with the form owner's Google account
- Google's terms apply to the data — it may be used by Google for service improvement
- There is no row-level access control, audit log, or data retention policy enforcement
- This is appropriate for an MVP but is not a permanent architecture for production data

**Before significantly scaling traffic or collecting more sensitive data**, consider migrating the lookup log to a purpose-built backend (e.g., a Supabase table with RLS, or a simple serverless function logging to a private store).

---

## 6. Stripe

Stripe processes payment transactions for forest kit and tee purchases. Stripe's own privacy policy governs payment data. The `client_reference_id` passed to Stripe contains EVC name, EVC code, and date — no personal information.

Users should be informed they are leaving the application when they click a purchase button. The current implementation opens Stripe in a new tab (`window.open(..., '_blank')`) without any prior notice. A brief "You'll be taken to our secure checkout" note near the purchase button would be appropriate.

---

## 7. Checklist before adding new data collection

Before adding any new form field, logging call, or third-party service that receives user data:

- [ ] What data is being collected?
- [ ] Is it personal information under the Privacy Act? (name, email, address, coordinates = yes)
- [ ] Is there a disclosure to the user at the point of collection?
- [ ] Is the collection proportionate to the purpose?
- [ ] Is it documented in this file?
- [ ] Does the privacy policy need to be updated?
- [ ] Is there a retention and deletion plan?
