# PWA.md — Service Worker, Manifest, and Deployment

**Repo:** Find My Ecological Garden (`super-barnacle`)
**Last updated:** May 2026

Read this before touching `service-worker.js`, `manifest.json`, or anything related to offline behaviour, caching, or deployment configuration.

---

## 1. Deployment overview

| Property | Value |
|---|---|
| Host | GitHub Pages |
| Repository | `github.com/tinyforests/super-barnacle` |
| Custom domain | `www.findmyecologicalgarden.com` |
| CNAME file | `www.findmyecologicalgarden.com` |
| Deploy trigger | Push to `main` branch |
| Deploy time | ~30 seconds |
| Build process | None — static files served directly |

There is no build step, no bundler, no npm, and no environment variables. What you commit is what ships.

---

## 2. 🔴 PRODUCTION-AFFECTING — Service worker BASE_PATH mismatch

This is the most significant technical issue in the repo. The service worker is currently inoperative on the live domain.

### The bug

`service-worker.js` line 2:

```js
const BASE_PATH = '/super-barnacle';
```

All cached URLs are prefixed with this path:

```js
const urlsToCache = [
  `${BASE_PATH}/`,            // → /super-barnacle/
  `${BASE_PATH}/index.html`,  // → /super-barnacle/index.html
  ...
];
```

On GitHub Pages without a custom domain, the site lives at `github.io/tinyforests/super-barnacle/` — this path prefix is correct.

On the custom domain `www.findmyecologicalgarden.com`, the site lives at `/` — all files are served from the root. The browser requests `/index.html`, but the service worker has cached `/super-barnacle/index.html`. No cache hit ever occurs. The service worker is silently doing nothing.

### The fix

Change `BASE_PATH` to an empty string:

```js
const BASE_PATH = '';
```

All cached URLs then become:
```js
`/`
`/index.html`
`/about.html`
...
```

Which matches how GitHub Pages serves files on the custom domain.

Alternatively, derive the base path dynamically:

```js
const BASE_PATH = new URL(self.location).pathname.replace(/\/service-worker\.js$/, '');
```

This works correctly on both the custom domain (`BASE_PATH = ''`) and a GitHub Pages subdirectory (`BASE_PATH = '/super-barnacle'`).

### After fixing

After changing `BASE_PATH`, increment `CACHE_NAME`:

```js
const CACHE_NAME = 'ecological-garden-v2';  // was v1
```

This forces all existing clients to discard the broken v1 cache and install the corrected v2 cache.

---

## 3. Manifest

`manifest.json` configures the PWA install prompt and home screen appearance.

```json
{
  "name": "Find My Ecological Garden",
  "short_name": "Eco Garden",
  "description": "Find indigenous plants for your Melbourne garden",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "background_color": "#fff0dc",
  "theme_color": "#3d4535",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Issues

**Description scope** — `"description"` says "Melbourne garden" but the tool covers all of Victoria. Update to: `"Find indigenous plants for your Victorian garden."` or `"Discover the ecological vegetation class for any Victorian address."` when updating the manifest.

**`short_name`** — "Eco Garden" is generic. Consider "Find My EVC" or "EVC Finder" for clarity on a home screen.

**`start_url` and `scope`** — both are `/`, which is correct for the custom domain. Do not change these to `/super-barnacle/`.

**Icon assets** — `icon-192.png` and `icon-512.png` exist in the root directory. No `maskable` icon is defined. Android adaptive icons benefit from a `"purpose": "maskable"` variant, but this is a minor improvement, not a blocker.

---

## 4. What is and isn't cached

### Currently cached (after BASE_PATH fix)

```
/                       → index.html
/index.html
/about.html
/contact.html
/evc-fetch.js
/curated-plants.json
leaflet.css (unpkg CDN)
leaflet.js (unpkg CDN)
turf.min.js (unpkg CDN)
```

### Not cached — should be added

```
/explore.html           — the EVC browser is missing entirely
/manifest.json          — should be cached for offline install
/favicon.png
/icon-192.png
/icon-512.png
```

Add these to `urlsToCache` in `service-worker.js`.

### Not cached — by design

```
VicGov WFS API          — live data, cannot cache meaningfully
Nominatim geocoding     — live data
Google Fonts            — CDN-served, browser caches separately
Google Forms            — POST endpoints, no caching
Stripe                  — payment links, no caching
```

### Offline behaviour

With the corrected cache, a user who has previously visited the site can:
- Load `index.html`, `about.html`, `contact.html`, `explore.html` offline
- Browse `curated-plants.json` plant data
- See the EVC grid on the explore page (data already cached)

They cannot:
- Perform a new address lookup (Nominatim is offline)
- Detect their EVC (WFS API is offline)
- Purchase (Stripe is offline)

There is no explicit offline fallback page. A reasonable addition would be a simple `offline.html` served by the service worker when a network request fails. Not currently implemented.

---

## 5. Cache strategy

The current service worker uses a **cache-first** strategy for all requests:

```js
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      if (response) return response;  // Cache hit
      return fetch(event.request);    // Cache miss → network
    })
  );
});
```

This is appropriate for static assets but means that updates to cached files (e.g., a new version of `evc-fetch.js`) will not reach users until the service worker is updated and the old cache is cleared.

### Updating cached files

To force users to receive updated files:
1. Make your code changes
2. Increment `CACHE_NAME` in `service-worker.js` (e.g., `ecological-garden-v3`)
3. Commit and push

The `activate` event handler clears old caches automatically:

```js
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
});
```

If you forget to increment `CACHE_NAME`, users with the old service worker will continue to receive old cached files until their browser eventually expires the service worker registration.

---

## 6. PWA install behaviour

### iOS (Safari)

- Install via "Add to Home Screen" in the share sheet
- Uses `apple-mobile-web-app-capable` and `apple-touch-icon` meta tags (present in all HTML files)
- Splash screen colour: `#3d4535` (theme-color)
- Status bar style: `black-translucent`
- The standalone display mode hides the Safari navigation bar

### Android (Chrome)

- Install via the browser's "Add to Home Screen" prompt
- Requires `manifest.json` to be linked and valid (it is)
- Requires a registered service worker (currently broken — see §2)
- After the BASE_PATH fix, the install prompt should work on Android

### Desktop (Chrome/Edge)

- Install prompt appears in the address bar when the PWA criteria are met
- Same service worker requirement applies

---

## 7. GitHub Pages configuration notes

- The CNAME file (`www.findmyecologicalgarden.com`) must remain in the repository root. Removing it breaks the custom domain.
- GitHub Pages serves the `main` branch by default. No Pages configuration file is needed.
- HTTPS is provided automatically by GitHub Pages for custom domains (via Let's Encrypt). Do not disable this.
- If geolocation stops working, check that the domain has a valid HTTPS certificate — geolocation requires a secure context.

---

## 8. Checklist before changing the service worker

- [ ] Have you incremented `CACHE_NAME`?
- [ ] Have you updated `urlsToCache` if new files were added?
- [ ] Is `BASE_PATH` correct for the deployment target?
- [ ] Have you tested offline behaviour after the change (DevTools → Network → Offline)?
- [ ] Have you verified the install prompt still appears on both iOS and Android?
