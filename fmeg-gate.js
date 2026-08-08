/**
 * FMEG Plant List — Email Gate (drop-in module)
 * Gardener & Son · Find My Ecological Garden
 *
 * WHAT IT DOES
 * - Reads the findmyevc handoff from URL params:
 *     ?address=&lat=&lng=&evc=&evc_name=&source=fmevc
 * - Renders a gate panel in place of the plant list.
 * - On submit: posts full payload (email + address + lat/lng + EVC + plants)
 *   to the Apps Script endpoint, unlocks the list in-page immediately,
 *   and the backend emails the list.
 * - Remembers the unlock per-EVC in sessionStorage so users aren't
 *   re-gated while browsing.
 *
 * INTEGRATION (vanilla FMEG stack)
 * 1. <script src="fmeg-gate.js"></script> before your evc-fetch script.
 * 2. Where you currently reveal plants, call instead:
 *
 *      FMEGGate.mount({
 *        container: document.getElementById('modal-plants'),
 *        evcCode:  evc.code,        // e.g. "EVC 61"
 *        evcName:  evc.name,        // e.g. "Box Ironbark Forest"
 *        plants:   plantArray,      // [{layer, name, common}, ...]
 *        renderList: yourExistingRenderFn   // (container, plants) => void
 *      });
 *
 *    FMEGGate decides whether to show the gate or go straight to
 *    renderList (already unlocked this session).
 * 3. Set ENDPOINT below to your deployed Apps Script /exec URL.
 */

(function () {
  'use strict';

  var ENDPOINT = 'PASTE_YOUR_APPS_SCRIPT_EXEC_URL_HERE';

  /* ---------- handoff params from findmyevc ---------- */

  var params = new URLSearchParams(window.location.search);
  var handoff = {
    address: params.get('address') || '',
    lat: params.get('lat') || '',
    lng: params.get('lng') || '',
    evcCode: params.get('evc') || '',
    evcName: params.get('evc_name') || '',
    source: params.get('source') || 'direct'
  };

  /* ---------- styles (G&S system, injected once) ---------- */

  var CSS = [
    '.fmeg-gate{border:1px solid #3d4535;background:#fff0dc;color:#3d4535;',
    'padding:28px 24px;max-width:520px;font-family:"IBM Plex Sans",sans-serif;}',
    '.fmeg-gate *{box-sizing:border-box;border-radius:0;}',
    '.fmeg-gate .eyebrow{font-family:"IBM Plex Mono",monospace;font-size:11px;',
    'letter-spacing:.12em;text-transform:uppercase;color:#3d4535;opacity:.75;',
    'display:block;margin-bottom:10px;}',
    '.fmeg-gate h3{font-family:"Fraunces",serif;font-weight:600;font-size:22px;',
    'line-height:1.25;margin:0 0 10px;}',
    '.fmeg-gate p{font-size:14.5px;line-height:1.6;margin:0 0 18px;}',
    '.fmeg-gate hr{border:0;border-top:1px solid #B49A63;margin:0 0 18px;}',
    '.fmeg-gate label{font-family:"IBM Plex Mono",monospace;font-size:12px;',
    'letter-spacing:.08em;text-transform:uppercase;display:block;margin-bottom:8px;}',
    '.fmeg-gate input[type=email]{width:100%;padding:13px 14px;font-size:15px;',
    'font-family:"IBM Plex Sans",sans-serif;border:1px solid #3d4535;',
    'background:#fff;color:#3d4535;margin-bottom:12px;}',
    '.fmeg-gate input[type=email]:focus{outline:2px solid #3d4535;outline-offset:1px;}',
    '.fmeg-gate .hp{position:absolute;left:-9999px;opacity:0;height:0;width:0;}',
    '.fmeg-gate button{width:100%;padding:14px 20px;cursor:pointer;border:0;',
    'background:#3d4535;color:#fff0dc;font-family:"IBM Plex Mono",monospace;',
    'font-size:13px;letter-spacing:.08em;text-transform:uppercase;}',
    '.fmeg-gate button:disabled{opacity:.6;cursor:wait;}',
    '.fmeg-gate .fine{font-size:11px;line-height:1.6;opacity:.78;margin:12px 0 0;}',
    '.fmeg-gate .err{display:none;font-family:"IBM Plex Mono",monospace;',
    'font-size:12px;color:#6b2f28;margin:0 0 12px;}',
    '.fmeg-gate .err.on{display:block;}',
    '@media (prefers-reduced-motion:no-preference){',
    '.fmeg-gate{transition:opacity .35s ease;}}'
  ].join('');

  function injectStyles() {
    if (document.getElementById('fmeg-gate-css')) return;
    var s = document.createElement('style');
    s.id = 'fmeg-gate-css';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ---------- session unlock memory ---------- */

  function unlockKey(evcCode) { return 'fmeg-unlocked-' + (evcCode || 'unknown'); }
  function isUnlocked(evcCode) {
    try { return sessionStorage.getItem(unlockKey(evcCode)) === '1'; }
    catch (e) { return false; }
  }
  function setUnlocked(evcCode) {
    try { sessionStorage.setItem(unlockKey(evcCode), '1'); } catch (e) {}
  }

  /* ---------- gate UI ---------- */

  function mount(opts) {
    injectStyles();
    var box = opts.container;
    if (!box) return;

    var evcCode = opts.evcCode || handoff.evcCode;
    var evcName = opts.evcName || handoff.evcName;

    if (isUnlocked(evcCode)) {
      opts.renderList(box, opts.plants);
      return;
    }

    box.innerHTML =
      '<div class="fmeg-gate">' +
      '<span class="eyebrow">Your full indigenous plant palette</span>' +
      '<h3>' + esc(evcName || 'Your ecological garden') + ' — the complete list</h3>' +
      '<p>Every canopy, mid-storey and ground-layer species that belongs to your ground. ' +
      'Enter your email and we’ll unlock the full palette here and send a copy to your inbox.</p>' +
      '<hr>' +
      '<label for="fmeg-email">Email address</label>' +
      '<form id="fmeg-gate-form" novalidate>' +
      '<input type="email" id="fmeg-email" name="email" placeholder="you@example.com" ' +
      'autocomplete="email" required>' +
      '<input type="text" class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<div class="err" id="fmeg-err">Enter a valid email address.</div>' +
      '<button type="submit" id="fmeg-btn">Unlock my plant list</button>' +
      '</form>' +
      '<p class="fine">We’ll email your list and occasional field notes from the studio. ' +
      'No selling, no sharing. Unsubscribe any time.</p>' +
      '</div>';

    var form = box.querySelector('#fmeg-gate-form');
    var input = box.querySelector('#fmeg-email');
    var btn = box.querySelector('#fmeg-btn');
    var err = box.querySelector('#fmeg-err');

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      err.classList.remove('on');
      var email = (input.value || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        err.classList.add('on');
        input.focus();
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Unlocking…';

      var payload = {
        email: email,
        website: form.querySelector('.hp').value || '',
        address: handoff.address,
        lat: handoff.lat,
        lng: handoff.lng,
        evc_code: evcCode,
        evc_name: evcName,
        source: handoff.source,
        referrer: document.referrer || '',
        page: window.location.href,
        plants: (opts.plants || []).map(function (p) {
          return { layer: p.layer || '', name: p.name || String(p), common: p.common || '' };
        })
      };

      // Optimistic unlock — list reveals immediately; capture posts in background.
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      }).catch(function () {});

      setUnlocked(evcCode);
      window.dispatchEvent(new CustomEvent('fmeg:unlocked', { detail: { evcCode: evcCode, email: email } }));

      var gateEl = box.querySelector('.fmeg-gate');
      gateEl.style.opacity = '0';
      setTimeout(function () {
        opts.renderList(box, opts.plants);
      }, 300);
    });
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  window.FMEGGate = { mount: mount, handoff: handoff };
})();
