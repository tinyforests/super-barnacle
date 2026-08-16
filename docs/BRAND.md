# BRAND.md — Brand Compliance

**Repo:** Find My Ecological Garden (`super-barnacle`)
**Last updated:** August 2026

Read this before making any visual or copy change. This file documents what the correct brand state looks like. The correct state is drawn from `SUPER_MIND.md` — this file is the repo-specific application of those standards.

---

## 1. The correct brand state

### Colours

| Token | Value | Role |
|---|---|---|
| Gardener Green | `#3d4535` | Primary — backgrounds, text, borders |
| Nostalgic Beige | `#fff0dc` | Page background; text on green |
| Beige Deep | `#f7e8cf` | Middle section band (light/deep/dark sandwich) |
| Dark Green | `#2f3928` | Hover states on green surfaces only |
| Signal Green | `#7C9A52` | **The accent role** — CTAs, active states, links, focus rings, card accents |
| Signal Green Hover | `#6A8544` | Hover state for Signal Green elements |
| Dry Grass Brass | `#B49A63` | Dividers and accents on **light backgrounds only**. Never body text. Never label text. Never on beige. |

**Brass restriction is absolute.** It reads as body copy colour on beige. Do not use it for any text role, even if muted.

No other colours should be introduced without a specific ecological reason. Do not add blues, purples, or warm greys — these drift the brand toward a generic consumer product.

### Typography

| Role | Typeface | When to use |
|---|---|---|
| Hero | Abril Fatface | **Hero only — once per page, never below the fold.** Page hero title exclusively. |
| Editorial display | Fraunces | Section headings (h1/h2/h3), pull quotes, card titles, EVC names in the modal. |
| Body and interface | IBM Plex Sans | All prose, navigation, button text, descriptions, paragraph copy. |
| Labels, data, identity | IBM Plex Mono | Labels, eyebrows, botanical names, EVC codes, coordinates, numerals, form inputs where monospace aids legibility. |

**Fraunces in `gate-test.html` is correct.** Do not remove it. Fraunces is the canonical editorial display face — it is not a deviation.

**Abril Fatface is hero-only.** One instance per page, in the above-the-fold hero section. It must not appear in section headings, modals, cards, or anywhere below the first viewport.

Google Fonts link (all four faces, correct weights):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;1,9..144,400&family=IBM+Plex+Mono:ital,wght@0,400;0,500;1,400&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
```

### Border radius

**Border-radius: 0. Everywhere. No exceptions.**

SUPER_MIND.md: *"No rounded corners anywhere. This is a registry and a record, not a consumer product."*

The only exception is third-party vendor widgets (Leaflet map tiles, Places autocomplete dropdown) that cannot be overridden without breaking functionality. Wrap these in `.vendor` — do not loosen the global rule.

### No gradients

All background colours must be flat. Replace any `linear-gradient(135deg, #3d4535 0%, #2f3928 100%)` with `background-color: #3d4535`. The darker `#2f3928` appears only on hover states via CSS transitions.

### No inline styles in JS

All visual properties must be in CSS classes, not `element.style.foo = "..."`. Inline styles in JS make the brand unenforceable — they can't be found by searching stylesheets and can't be updated from a design token. Exception: dynamically computed values (coordinates, transforms) that cannot be expressed as classes.

---

## 2. CSS custom properties (design tokens)

Defined in `assets/brand.css` and linked from every page. Reference these tokens — do not hardcode hex values.

```css
:root {
  /* Core palette */
  --green:         #3d4535;
  --beige:         #fff0dc;
  --beige-deep:    #f7e8cf;
  --signal:        #7C9A52;   /* the accent role */
  --signal-hover:  #6A8544;
  --brass:         #B49A63;   /* dividers on light backgrounds only */

  /* Derived text */
  --ink:           var(--green);
  --ink-muted:     rgba(61, 69, 53, 0.68);
  --ink-faint:     rgba(61, 69, 53, 0.42);
  --ink-invert:    var(--beige);
  --ink-invert-muted: rgba(255, 240, 220, 0.70);

  /* Hairlines */
  --rule:          rgba(61, 69, 53, 0.16);
  --rule-invert:   rgba(255, 240, 220, 0.20);

  /* Type */
  --font-hero:     'Abril Fatface', Georgia, serif;
  --font-display:  'Fraunces', Georgia, serif;
  --font-body:     'IBM Plex Sans', system-ui, sans-serif;
  --font-mono:     'IBM Plex Mono', ui-monospace, monospace;

  /* Shape */
  --radius: 0;
}
```

---

## 3. Current violations — known debt

Address these as you work through the files. Do not re-audit from scratch.

### Border-radius violations

| Element | Current value | File |
|---|---|---|
| Hamburger menu | `border-radius: 50%` | `index.html` |
| Nav close button | circular | `index.html` |
| All CTA buttons | `border-radius: 50px` | `index.html`, `evc-fetch.js` |
| Modal content container | `border-radius: 20px` | `index.html`, `explore.html` |
| Modal close button | `border-radius: 50%` | `index.html`, `explore.html` |
| Back buttons | `border-radius: 50%` | `about.html`, `contact.html` |
| Brand badge | `border-radius: 50px` | All pages |
| Hero highlight / instruction box | `border-radius: 12px` | `index.html` |
| EVC description box | `border-radius: 12px` | `index.html`, `explore.html` |
| EVC cards | `border-radius: 12px` | `explore.html` |
| Step indicator circles | `border-radius: 50%` | `index.html` |
| Filter chips and badges | `border-radius: 20px` | `explore.html` |
| Autocomplete dropdown | `border-radius: 8px` | `evc-fetch.js` inline — **vendor, do not change** |
| Kit section | `border-radius: 12px` | `evc-fetch.js` inline |
| Tee section | `border-radius: 12px` | `evc-fetch.js` inline |
| Registry banner | `border-radius: 0 8px 8px 0` | `evc-fetch.js` inline |
| Plant image tooltips | `border-radius: 8px` | `evc-fetch.js` inline |
| Preorder modal container | `border-radius: 20px` | `index.html` inline |
| Preorder form inputs | `border-radius: 50px`, `12px` | `index.html` inline |
| Contact and about cards | `border-radius: 12px` | `about.html`, `contact.html` |
| Footer acknowledgement box | `border-radius: 8px` | `index.html`, `about.html`, `contact.html` |

The Autocomplete dropdown is a vendor widget. Use `.vendor` wrapper rather than overriding directly.

### Gradient violations

| Element | Current value | Should be |
|---|---|---|
| Section 2 background | `linear-gradient(135deg, #3d4535 0%, #2f3928 100%)` | `background-color: var(--green)` |
| Hamburger menu | gradient on hover | flat `#2f3928` on hover |
| Email section | gradient | flat `var(--green)` |
| Contact cards | gradient | flat `var(--green)` |
| Location info block | gradient | flat `var(--green)` |
| Brand badge | gradient | flat `var(--green)` |
| Back button hover | gradient | flat `#2f3928` |

---

## 4. Voice — current violations

| Copy | File | Issue | Suggested replacement |
|---|---|---|---|
| "Join the ecological movement." | `index.html`, `explore.html` | "Movement" is startup hype | "Stay connected to the ecology of your place." |
| "Their vision is simple: To make biodiversity mainstream…" | `about.html` | "mainstream" is a commercial aspiration | "Their work begins with one place, and one garden." |
| "Indigenous plants have grown in harmony with local soils…" | `index.html` | Over-spiritualised | "Indigenous plants have co-evolved with local soils, climate, and wildlife over thousands of years." |
| "native wildlife" | `index.html` | Should be "indigenous" or "local" | "local wildlife" |
| "Native plant selections and EVC-appropriate plantings" | `contact.html` | Should be "indigenous" | "Indigenous plant selections and EVC-appropriate plantings" |
| "Custom t-shirt and merchandise inquiries" | `contact.html` | "merchandise" is not G&S voice | "Ecological tee inquiries" |

### Words that matter (from SUPER_MIND.md)

| Avoid | Use instead |
|---|---|
| native (when meaning EVC-correct) | indigenous |
| sustainable / eco-friendly / green | ecological, specific to the EVC |
| movement | (omit or reframe) |
| mainstream | (omit or reframe) |
| harmony with | co-evolved with / belongs to |
| landscaping | ecological garden design |
| community (for registered gardens) | network |
| certified | verified |
| owner | steward |

---

## 5. Brand-correct patterns

### Correct button

```css
.btn-primary-action {
  display: inline-flex;
  align-items: center;
  font-family: var(--font-mono);
  font-size: var(--step--1);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 0.95rem 1.6rem;
  background: var(--signal);
  color: var(--beige);
  border: 1px solid var(--signal);
  border-radius: var(--radius);
  cursor: pointer;
  transition: background 160ms ease, border-color 160ms ease;
}
.btn-primary-action:hover { background: var(--signal-hover); border-color: var(--signal-hover); }

.btn-secondary-action {
  background: transparent;
  color: var(--ink);
  border: 1px solid var(--rule);
  border-radius: var(--radius);
}
.btn-secondary-action:hover { border-color: var(--signal); color: var(--signal); }
```

### Correct card

```css
.card {
  background: transparent;
  border-top: 2px solid var(--signal);
  border-radius: var(--radius);
  padding: var(--gap-m) 0 0;
}
```

### Correct input

```css
.field {
  width: 100%;
  padding: 0.9rem 1rem;
  background: transparent;
  border: 1px solid var(--rule);
  color: var(--ink);
  font-family: var(--font-body);
  border-radius: var(--radius);
}
.field:focus { border-color: var(--signal); outline: none; }
```

---

## 6. Imagery

- **EVC images** (`images/evcs/`) — landscape and habitat photography. Show the living EVC community, not a styled garden.
- **Plant images** (`images/plants/`) — close-up botanical. Clean background or natural context. Identifiable.
- **Tee images** (`images/tees/`) — product photography. Flat lay or worn. The EVC name or illustration should be legible.
- **No stock photography** that looks generic or lifestyle-oriented.
- **No decorative borders, drop shadows, or vignettes** on imagery.

---

## 7. The signal principle

Signal Green (`#7C9A52`) is **the accent role** — it appears on CTAs, active states, hover states, focus rings, card accent bars, and interactive links. It is the single accent colour in the system.

It does not appear on purely decorative elements with no interactive or semantic meaning. When in doubt: if a user can interact with it or if it conveys status, Signal Green is correct. If it is purely decoration, it is probably wrong.

Brass (`#B49A63`) is the divider colour on light backgrounds only. It never appears as text, label, or accent on beige or dark backgrounds.
