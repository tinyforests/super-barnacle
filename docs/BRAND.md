# BRAND.md — Brand Compliance

**Repo:** Find My Ecological Garden (`super-barnacle`)
**Last updated:** May 2026

Read this before making any visual or copy change. This file documents what the correct brand state looks like and where the current codebase diverges from it. The correct state is drawn from `SUPER_MIND.md` — this file is the repo-specific application of those standards.

---

## 1. The correct brand state

### Colours

| Token | Value | Use |
|---|---|---|
| Gardener Green | `#3d4535` | Primary — backgrounds, text, buttons, borders |
| Nostalgic Beige | `#fff0dc` | Secondary — page background, text-on-green |
| Dark Green | `#2f3928` | Hover states only — a slightly darker green |
| Signal Green | Functional only | Use only where meaning is being conveyed (status indicators). Do not use decoratively. |
| White | `#ffffff` | Input fields, card backgrounds where contrast is needed |

No other colours should be introduced without a specific ecological reason. Do not add blues, purples, or warm greys — these drift the brand toward a generic consumer product.

### Typography

| Role | Typeface | When to use |
|---|---|---|
| Display / ceremonial | Abril Fatface | Page titles, EVC names in the modal, section headers, email section headings |
| Body and interface | IBM Plex Sans | All prose, labels, navigation, button text, descriptions, the about page, all paragraph copy |
| Data and identity | IBM Plex Mono | EVC codes (e.g. "EVC 55"), coordinates, timestamps, form inputs where monospace aids legibility |

**IBM Plex Sans is not currently loaded.** Until it is, every line of prose reads as data output. Add it to the Google Fonts link in all four HTML files:

```html
<link
  href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=IBM+Plex+Sans:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@300;400;500;700&display=swap"
  rel="stylesheet"
/>
```

Then update the body font-family:

```css
body {
  font-family: "IBM Plex Sans", sans-serif;
}
```

And restrict Mono to data contexts only:

```css
.evc-code,
.coordinates,
input[type="text"],
input[type="email"],
input[type="tel"],
input[type="number"] {
  font-family: "IBM Plex Mono", monospace;
}
```

### Border radius

**Border-radius: 0. Everywhere. No exceptions.**

SUPER_MIND.md: *"No rounded corners anywhere. This is a registry and a record, not a consumer product."*

This means:
- Buttons: `border-radius: 0`
- Modals and panels: `border-radius: 0`
- Cards: `border-radius: 0`
- Inputs: `border-radius: 0`
- Badges and chips: `border-radius: 0`
- Navigation close button: `border-radius: 0` (square, not circular)
- Hamburger menu: `border-radius: 0` (square, not circular)

The only exception is the map tiles themselves (rendered by Leaflet) — those cannot be overridden without affecting map functionality.

### No gradients

All background colours must be flat. Replace all `linear-gradient(135deg, #3d4535 0%, #2f3928 100%)` with `background-color: #3d4535`. The darker `#2f3928` should appear only on hover states via CSS transitions, not as part of a gradient fill.

### No inline styles

All visual properties must be in CSS classes, not `element.style.foo = "..."`. Inline styles in `evc-fetch.js` make the brand unenforceable — they cannot be overridden by CSS without `!important`, cannot be found by searching stylesheets, and cannot be updated from a design token.

---

## 2. CSS custom properties (design tokens)

These tokens should be defined in a `<style>` block in each HTML file (or in a shared `styles.css` once extracted) and referenced throughout. They are **not yet implemented** — this is the target state.

```css
:root {
  /* Colours */
  --color-green:       #3d4535;
  --color-green-dark:  #2f3928;
  --color-beige:       #fff0dc;
  --color-white:       #ffffff;

  /* Typography */
  --font-display:      "Abril Fatface", serif;
  --font-body:         "IBM Plex Sans", sans-serif;
  --font-data:         "IBM Plex Mono", monospace;

  /* Spacing */
  --space-xs:  0.5rem;
  --space-sm:  1rem;
  --space-md:  1.5rem;
  --space-lg:  2.5rem;
  --space-xl:  4rem;

  /* Shape */
  --radius:    0;  /* Border-radius: 0 everywhere */

  /* Transitions */
  --transition: all 0.3s ease;
}
```

Using `var(--color-green)` instead of `#3d4535` throughout means the palette can be updated in one place. Using `var(--radius)` means the no-rounded-corners rule is enforced by the token, not by memory.

When implementing this, also replace the inline styles in `evc-fetch.js` with CSS classes that use these tokens.

---

## 3. Current violations — known debt

This is the inventory of brand violations present in the codebase as of May 2026. Address these as you work through the files, rather than re-auditing from scratch.

### Border-radius violations

| Element | Current value | File |
|---|---|---|
| Hamburger menu | `border-radius: 50%` | `index.html` |
| Nav close button | circular | `index.html` |
| All CTA buttons (search, location, scroll, kit, tee) | `border-radius: 50px` | `index.html`, `evc-fetch.js` |
| Modal content container | `border-radius: 20px` | `index.html`, `explore.html` |
| Modal close button | `border-radius: 50%` | `index.html`, `explore.html` |
| Back buttons | `border-radius: 50%` | `about.html`, `contact.html` |
| Brand badge | `border-radius: 50px` | All pages |
| Hero highlight / instruction box | `border-radius: 12px` | `index.html` |
| EVC description box | `border-radius: 12px` | `index.html`, `explore.html` |
| EVC cards | `border-radius: 12px` | `explore.html` |
| Step indicator circles | `border-radius: 50%` | `index.html` |
| Filter chips and badges | `border-radius: 20px` | `explore.html` |
| Autocomplete dropdown | `border-radius: 8px` | `evc-fetch.js` inline |
| Kit section | `border-radius: 12px` | `evc-fetch.js` inline |
| Tee section | `border-radius: 12px` | `evc-fetch.js` inline |
| Registry banner | `border-radius: 0 8px 8px 0` | `evc-fetch.js` inline |
| Plant image tooltips | `border-radius: 8px` | `evc-fetch.js` inline |
| Preorder modal container | `border-radius: 20px` | `index.html` inline |
| Preorder form inputs | `border-radius: 50px`, `12px` | `index.html` inline |
| Contact and about cards | `border-radius: 12px` | `about.html`, `contact.html` |
| Footer acknowledgement box | `border-radius: 8px` | `index.html`, `about.html`, `contact.html` |

### Font violations

| Issue | Location |
|---|---|
| IBM Plex Sans not loaded | All four HTML files |
| `body { font-family: "IBM Plex Mono" }` — Mono used for all prose | All four HTML files |
| Inline `style.fontFamily` = Mono or Abril set throughout | `evc-fetch.js` |

### Gradient violations

| Element | Current value | Should be |
|---|---|---|
| Section 2 background | `linear-gradient(135deg, #3d4535 0%, #2f3928 100%)` | `background-color: #3d4535` |
| Hamburger menu | gradient on hover | flat `#2f3928` on hover |
| Email section | gradient | flat `#3d4535` |
| Contact cards | gradient | flat `#3d4535` |
| Location info block | gradient | flat `#3d4535` |
| Brand badge | gradient | flat `#3d4535` |
| Back button hover | gradient | flat `#2f3928` |

---

## 4. Voice — current violations

These copy violations are present in the codebase as of May 2026.

| Copy | File | Issue | Suggested replacement |
|---|---|---|---|
| "Join the ecological movement." | `index.html:748`, `explore.html:711` | "Movement" is startup hype | "Stay connected to the ecology of your place." |
| "Their vision is simple: To make biodiversity mainstream — one garden, one story, one community at a time." | `about.html:473` | Hype; "mainstream" is a commercial aspiration | Remove or reframe: "Their work begins with one place, and one garden." |
| "Indigenous plants have grown in harmony with local soils, climate, and wildlife for countless generations" | `index.html:673` | Over-spiritualised | "Indigenous plants have co-evolved with local soils, climate, and wildlife over thousands of years." |
| "native wildlife" | `index.html:674` | Should be "indigenous" or "local" | "local wildlife" |
| "Native plant selections and EVC-appropriate plantings" | `contact.html:415` | Should be "indigenous" | "Indigenous plant selections and EVC-appropriate plantings" |
| "Custom t-shirt and merchandise inquiries" | `contact.html:416` | "merchandise" is not G&S voice | "Ecological tee inquiries" |

### Words that matter (from SUPER_MIND.md)

These substitutions apply across all copy in this repo:

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

Reference these when building new UI elements.

### Correct button

```css
.btn {
  padding: 1.2rem 2.5rem;
  background-color: var(--color-green);
  color: var(--color-beige);
  border: none;
  border-radius: var(--radius);           /* 0 */
  font-family: var(--font-body);
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: var(--transition);
}

.btn:hover {
  background-color: var(--color-green-dark);
}

.btn--outline {
  background-color: transparent;
  border: 2px solid var(--color-green);
  color: var(--color-green);
}

.btn--outline:hover {
  background-color: var(--color-green);
  color: var(--color-beige);
}
```

### Correct card / panel

```css
.panel {
  background-color: var(--color-white);
  border: 1px solid rgba(61, 69, 53, 0.15);
  border-radius: var(--radius);           /* 0 */
  padding: var(--space-lg);
}

.panel--green {
  background-color: var(--color-green);
  color: var(--color-beige);
}
```

### Correct input

```css
input[type="text"],
input[type="email"],
input[type="search"] {
  padding: 1.2rem 1.5rem;
  font-family: var(--font-data);          /* Mono for inputs */
  font-size: 1rem;
  border: 2px solid var(--color-green);
  border-radius: var(--radius);           /* 0 */
  background-color: var(--color-white);
  color: var(--color-green);
  outline: none;
}
```

### Correct EVC code display

```css
.evc-code {
  font-family: var(--font-data);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #999;
}
```

---

## 6. Imagery

- **EVC images** (`images/evcs/`) — landscape and habitat photography. Show the living EVC community, not a styled garden. These should feel like ecological fieldwork, not lifestyle photography.
- **Plant images** (`images/plants/`) — close-up botanical. Clean background or natural context. Identifiable.
- **Tee images** (`images/tees/`) — product photography. Flat lay or worn. The EVC name or illustration should be legible.
- **No stock photography** that looks generic or lifestyle-oriented. The Ecologist Mind and Designer Mind both reject this.
- **No decorative borders, drop shadows, or vignettes** on imagery. Let the photograph speak.

---

## 7. The signal principle (from SUPER_MIND.md)

*"Signal Green is functional, not decorative — it appears only where meaning is being conveyed."*

In this repo, Signal Green (a brighter green used for status indicators) should only appear on:
- "Plant list available" status badges (functional: tells the user data exists)
- Explicit success states

It should not appear on decorative accents, dividers, borders as visual interest, or any element that doesn't carry ecological or status meaning.
