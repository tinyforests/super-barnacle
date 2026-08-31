/**
 * FMEG Plant List — Email Gate backend
 * Gardener & Son · Find My Ecological Garden
 *
 * Captures gate submissions to a Google Sheet and emails the
 * plant list to the subscriber.
 *
 * SETUP
 * 1. Create a Google Sheet named "FMEG Plant List — Email Gate".
 *    Row 1 headers (exactly, in order):
 *    Timestamp | Email | Address | Lat | Lng | EVC Code | EVC Name | Source | Referrer | Page
 * 2. Paste this file into a new Apps Script project bound to that Sheet
 *    (Extensions → Apps Script), or set SHEET_ID below for a standalone script.
 * 3. Deploy → New deployment → Web app
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the /exec URL into ENDPOINT in fmeg-gate.js.
 *
 * NOTES
 * - No shared secret by design: this is a lead form, not an enrolment system.
 *   Honeypot + dedup + length caps are the guard rails.
 * - Client posts Content-Type: text/plain to avoid a CORS preflight —
 *   this is the pattern that works reliably with Apps Script web apps.
 */

var SHEET_NAME = 'Submissions';       // tab name inside the spreadsheet
var SHEET_ID = '1w_H8aplOy-qtR18zXWUfAXl-suRFyW4ugdoQzjr5Tn0';
var FROM_NAME = 'Find My Ecological Garden';
var REPLY_TO = 'hello@gardenerandson.com';   // update if needed
var MAX_PLANTS = 120;                 // cap on plant lines accepted in payload

function doPost(e) {
  try {
    var raw = e && e.postData && e.postData.contents ? e.postData.contents : '{}';
    var p = JSON.parse(raw);

    // Honeypot: real users never fill this field.
    if (p.website) return respond({ ok: true }); // silently accept, log nothing

    var email = clean(p.email, 120).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      return respond({ ok: false, error: 'invalid_email' });
    }

    var row = {
      email: email,
      address: clean(p.address, 200),
      lat: numOrBlank(p.lat),
      lng: numOrBlank(p.lng),
      evcCode: clean(p.evc_code, 20),
      evcName: clean(p.evc_name, 120),
      source: clean(p.source, 40) || 'direct',
      referrer: clean(p.referrer, 300),
      page: clean(p.page, 300)
    };

    var sheet = getSheet();

    // Dedup: same email + same EVC code already captured → don't re-log,
    // but still return ok so the list unlocks and the email re-sends.
    var isDuplicate = findExisting(sheet, row.email, row.evcCode);
    if (!isDuplicate) {
      sheet.appendRow([
        new Date(), row.email, row.address, row.lat, row.lng,
        row.evcCode, row.evcName, row.source, row.referrer, row.page
      ]);
    }

    // Email the plant list if the client sent one.
    var plants = sanitisePlants(p.plants);
    if (plants.length) {
      sendPlantList(row, plants);
    }

    return respond({ ok: true, deduped: isDuplicate });

  } catch (err) {
    return respond({ ok: false, error: 'server_error' });
  }
}

function getSheet() {
  var ss = SHEET_ID
    ? SpreadsheetApp.openById(SHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(['Timestamp', 'Email', 'Address', 'Lat', 'Lng',
      'EVC Code', 'EVC Name', 'Source', 'Referrer', 'Page']);
  }
  return sheet;
}

function findExisting(sheet, email, evcCode) {
  var last = sheet.getLastRow();
  if (last < 2) return false;
  var data = sheet.getRange(2, 2, last - 1, 5).getValues(); // Email..EVC Code
  for (var i = 0; i < data.length; i++) {
    if (String(data[i][0]).toLowerCase() === email &&
        String(data[i][4]) === evcCode) return true;
  }
  return false;
}

function sendPlantList(row, plants) {
  var evc = row.evcName || 'your Ecological Vegetation Class';
  var subject = 'Your indigenous plant list — ' + evc;

  // Plain-text fallback (accessibility + clients that block HTML).
  var lines = plants.map(function (pl) {
    return pl.layer
      ? pl.layer.toUpperCase() + '  ·  ' + pl.name + (pl.common ? ' — ' + pl.common : '')
      : pl.name + (pl.common ? ' — ' + pl.common : '');
  });

  var body =
    'FIND MY ECOLOGICAL GARDEN · a Gardener & Son project\n' +
    '——————————————————————————————\n\n' +
    'Your ecological garden begins here.\n\n' +
    'EVC: ' + evc + (row.evcCode ? ' (' + row.evcCode + ')' : '') + '\n' +
    (row.address ? 'Address: ' + row.address + '\n' : '') +
    '\nYOUR INDIGENOUS PLANT PALETTE\n\n' +
    lines.join('\n') +
    '\n\n——————————————————————————————\n' +
    'These species belong to your ground — grown in step with your soils,\n' +
    'climate and wildlife for countless generations.\n\n' +
    'When your garden is planted, register it:\n' +
    'https://ecologicalregistry.org\n\n' +
    'Gardener & Son · Mont Albert & Hawthorn\n' +
    'gardenerandson.com\n';

  GmailApp.sendEmail(row.email, subject, body, {
    from: REPLY_TO,
    name: FROM_NAME,
    htmlBody: buildHtmlEmail(row, evc, plants, getAvailablePlantImages())
  });
}

var SITE = 'https://www.findmyecologicalgarden.com';

// Slugs of plant photos published at SITE/images/plants/<slug>.jpg. Baked in so
// the email needs no network call or extra scopes to know which images exist.
// Regenerate when the photo set changes:
//   node -e "console.log(JSON.stringify(require('./images/plants/manifest.json').sort()))"
var PLANT_IMAGE_SLUGS = [
  'alpine-ash', 'angled-lobelia', 'annual-fireweed', 'austral-bracken', 'austral-brooklime',
  'austral-grass-tree', 'austral-indigo', 'austral-seablite', 'austral-storks-bill',
  'australian-gipsywort', 'australian-salt-grass', 'bats-wing-fern', 'beach-spinifex',
  'beaded-glasswort', 'beaked-fireweed', 'beaked-hakea', 'bent-goodenia', 'berry-saltbush',
  'bidgee-widgee', 'bindweed-wilsonia', 'black-anther-flax-lily', 'black-samphire',
  'black-sheoak', 'black-wattle', 'blackwood', 'blady-grass', 'blanket-leaf',
  'blue-tussock-grass', 'bluebells', 'boobyalla', 'bower-spinach', 'broad-leaved-peppermint',
  'broom-spurge', 'brown-stringybark', 'bulbine-lily', 'buloke', 'bundled-guinea-flower', 'bundy',
  'burgan', 'bushy-clubmoss', 'button-everlasting', 'button-grass', 'candlebark',
  'cats-claw-grevillea', 'centella', 'chaffy-saw-sedge', 'cherry-ballart', 'chocolate-lily',
  'cluster-pomaderris', 'clustered-everlasting', 'coast-banksia', 'coast-beard-heath',
  'coast-everlasting', 'coast-manna-gum', 'coast-saltbush', 'coast-saw-sedge',
  'coast-spear-grass', 'coast-tea-tree', 'coast-tussock-grass', 'coast-wattle', 'coastal-wattle',
  'comb-wheat-grass', 'common-apple-berry', 'common-beard-heath', 'common-blown-grass',
  'common-bog-sedge', 'common-boobialla', 'common-bottle-daisy', 'common-buttercup',
  'common-cassinia', 'common-correa', 'common-duckweed', 'common-everlasting', 'common-flat-pea',
  'common-grass-sedge', 'common-heath', 'common-hovea', 'common-maidenhair',
  'common-rapier-sedge', 'common-raspwort', 'common-reed', 'common-rice-flower',
  'common-spike-sedge', 'common-tussock-grass', 'common-wallaby-grass', 'coral-heath',
  'cottony-fireweed', 'cranberry-heath', 'creamy-candles', 'creeping-bossiaea',
  'creeping-brookweed', 'creeping-cotula', 'creeping-cudweed', 'creeping-monkey-flower',
  'cushion-bush', 'cut-leaf-daisy', 'cut-leaf-xanthosia', 'cypress-daisy-bush',
  'downy-dodder-laurel', 'drooping-cassinia', 'drooping-sheoak', 'dune-fireweed', 'dusty-miller',
  'dwarf-boronia', 'dwarf-bush-pea', 'dwarf-mat-rush', 'dwarf-wedge-pea', 'early-nancy',
  'erect-guinea-flower', 'everlasting', 'fen-sedge', 'fireweed-groundsel', 'fishbone-water-fern',
  'forest-hounds-tongue', 'forest-starwort', 'gippsland-red-gum', 'glandular-pink-bells',
  'gold-dust-wattle', 'golden-spray', 'golden-wattle', 'grass-trigger-plant',
  'grassland-wood-sorrel', 'grey-box', 'grey-guinea-flower', 'grey-parrot-pea',
  'grey-tussock-grass', 'gristle-fern', 'hairy-centrolepis', 'hairy-knotweed', 'hairy-pennywort',
  'hairy-rice-grass', 'hairy-spinifex', 'hard-water-fern', 'hazel-pomaderris', 'heath-tea-tree',
  'heath-xanthosia', 'hedge-wattle', 'hidden-violet', 'hoary-rapier-sedge', 'hoary-sunray',
  'hollow-rush', 'honey-pots', 'hop-bitter-pea', 'hop-goodenia', 'hop-wattle', 'horny-cone-bush',
  'hyacinth-orchid', 'ivy-leaf-violet', 'joint-leaf-rush', 'jointed-twig-rush', 'kangaroo-apple',
  'kangaroo-grass', 'karkalla', 'kidney-weed', 'kneed-spear-grass', 'kneed-wallaby-grass',
  'knobby-club-rush', 'knobby-club-sedge', 'large-bindweed', 'large-leaf-bush-pea',
  'leafy-flat-sedge', 'lightwood', 'little-club-sedge', 'love-creeper', 'manna-gum',
  'marine-couch', 'matted-bog-sedge', 'matted-nertera', 'matted-pratia', 'mealy-stringybark',
  'messmate', 'messmate-stringybark', 'milkmaids', 'milky-beauty-heads', 'mother-shield-fern',
  'mountain-ash', 'mountain-clematis', 'mountain-grevillea', 'mountain-grey-gum',
  'musk-daisy-bush', 'myrtle-wattle', 'narrow-leaf-bitter-pea', 'narrow-leaf-hop-bush',
  'narrow-leaf-peppermint', 'new-holland-daisy', 'nodding-saltbush', 'pacific-azolla',
  'pale-flax-lily', 'pale-rush', 'pink-bells', 'pink-bindweed', 'pink-bladderwort',
  'pithy-sword-sedge', 'poison-lobelia', 'prickly-broom-heath', 'prickly-currant-bush',
  'prickly-moses', 'prickly-starwort', 'prickly-tea-tree', 'privet-mock-olive',
  'purple-coral-pea', 'purple-loosestrife', 'red-box', 'red-fruit-saw-sedge', 'red-ironbark',
  'red-stringybark', 'reed-bent-grass', 'river-bottlebrush', 'river-club-sedge', 'river-mint',
  'river-red-gum', 'rough-barked-manna-gum', 'rough-tree-fern', 'rounded-noon-flower',
  'ruby-saltbush', 'running-postman', 'scaly-buttons', 'scented-paperbark', 'scented-sundew',
  'screw-fern', 'scrub-nettle', 'sea-box', 'sea-celery', 'sea-rush', 'seaberry-saltbush',
  'shady-wood-sorrel', 'shield-pennywort', 'shining-pennywort', 'shining-peppermint',
  'shiny-cassinia', 'shiny-swamp-mat', 'shore-bindweed', 'showy-parrot-pea', 'shrubby-fireweed',
  'shrubby-glasswort', 'silver-banksia', 'silver-wattle', 'silverleaf-stringybark',
  'silvertop-wallaby-grass', 'slender-bog-sedge', 'slender-dock', 'slender-dodder-laurel',
  'slender-fireweed', 'slender-knotweed', 'slender-speedwell', 'slender-tussock-grass',
  'small-grass-tree', 'small-leaf-bramble', 'small-leaved-clematis', 'small-mat-rush',
  'small-poranthera', 'small-st-johns-wort', 'smooth-parrot-pea', 'smooth-solenogyne',
  'snowy-daisy-bush', 'soft-tree-fern', 'soft-tussock-grass', 'spear-grass', 'spike-beard-heath',
  'spiny-headed-mat-rush', 'spotted-knotweed', 'sprawling-bluebell', 'spreading-rope-rush',
  'sticky-boobialla', 'sticky-hop-bush', 'stinking-pennywort', 'streaked-arrow-grass',
  'streaked-arrowgrass', 'supple-spear-grass', 'swamp-club-sedge', 'swamp-crassula', 'swamp-gum',
  'swamp-mazus', 'swamp-paperbark', 'swamp-raspwort', 'swamp-selaginella', 'swamp-starwort',
  'sweet-bursaria', 'sword-tussock-grass', 'tall-bluebell', 'tall-greenhood', 'tall-rush',
  'tall-saw-sedge', 'tall-sedge', 'tall-sundew', 'tall-sword-sedge', 'tangled-bedstraw',
  'tasman-flax-lily', 'tassel-rope-rush', 'thatch-saw-sedge', 'thin-leaf-wattle', 'thyme-spurge',
  'trailing-goodenia', 'trailing-speedwell', 'tree-everlasting', 'tree-violet', 'twining-glycine',
  'upright-guinea-flower', 'upright-water-milfoil', 'variable-groundsel', 'variable-stinkweed',
  'variable-sword-sedge', 'variable-willow-herb', 'varnish-wattle', 'veined-spear-grass',
  'victorian-christmas-bush', 'water-ribbons', 'wattle-mat-rush', 'weeping-grass', 'white-correa',
  'white-elderberry', 'white-sebaea', 'white-top-wallaby-grass', 'wing-pennywort',
  'wire-rapier-sedge', 'wirilda', 'wiry-buttons', 'wiry-spear-grass', 'woolly-tea-tree',
  'yellow-box', 'yellow-gum', 'yellow-rush-lily'
];

// { slug: true } lookup used to decide which plants get a thumbnail.
function getAvailablePlantImages() {
  var map = {};
  for (var i = 0; i < PLANT_IMAGE_SLUGS.length; i++) map[PLANT_IMAGE_SLUGS[i]] = true;
  return map;
}

// Common-name slug matching the image filename convention used site-wide
// (see checkPlantImage in evc-fetch.js): lowercase, spaces → '-', drop apostrophes.
function plantSlug(pl) {
  var base = (pl.common || pl.name || '');
  return base.toLowerCase().replace(/\s+/g, '-').replace(/['’]/g, '');
}

/**
 * Builds the Gardener & Son HTML email for the plant list.
 * Email-safe: table layout, inline styles, border-radius 0, web-safe
 * font fallbacks (Abril Fatface / IBM Plex resolve only in clients that
 * honour the web-font link; Georgia / system stacks everywhere else).
 */
function buildHtmlEmail(row, evc, plants, available) {
  var GREEN = '#3d4535';
  var BEIGE = '#fff0dc';
  var ACCENT = '#a8c285';
  var MUTED = '#6b7263';
  var RULE = 'rgba(61,69,53,0.14)';
  var SERIF = "'Abril Fatface', Georgia, 'Times New Roman', serif";
  var BODYSERIF = "Georgia, 'Times New Roman', serif";
  var SANS = "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";
  var MONO = "'IBM Plex Mono', 'Courier New', Courier, monospace";
  var REGISTRY_URL = 'https://ecologicalregistry.org';

  // Deep link back to this reader's EVC result on the site (re-opens the
  // full palette + kit + registry). Every plant row links here.
  var resultUrl = SITE + '/?evc=' + encodeURIComponent(row.evcCode || '') +
    '&name=' + encodeURIComponent(evc);

  var groups = groupByLayer(plants);
  var showedThumb = false;

  var out = [];
  out.push('<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">');
  out.push('<meta name="viewport" content="width=device-width, initial-scale=1">');
  out.push('<meta name="color-scheme" content="light only">');
  out.push('<link href="https://fonts.googleapis.com/css2?family=Abril+Fatface&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500&display=swap" rel="stylesheet">');
  out.push('</head>');
  out.push('<body style="margin:0;padding:0;background:' + BEIGE + ';">');
  // Hidden preheader (inbox preview text)
  out.push('<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Your indigenous plant palette for ' + esc(evc) + '.</div>');

  out.push('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' + BEIGE + ';">');
  out.push('<tr><td align="center" style="padding:32px 16px;">');
  out.push('<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:' + BEIGE + ';">');

  // Masthead
  out.push('<tr><td style="padding:0 8px 16px 8px;border-bottom:1px solid ' + GREEN + ';">' +
    '<div style="font-family:' + MONO + ';font-size:11px;letter-spacing:2px;text-transform:uppercase;color:' + GREEN + ';line-height:1.5;">Find My Ecological Garden</div>' +
    '<div style="font-family:' + MONO + ';font-size:11px;letter-spacing:2px;text-transform:uppercase;color:' + MUTED + ';line-height:1.5;">A Gardener &amp; Son Project</div>' +
    '</td></tr>');

  // Headline
  out.push('<tr><td style="padding:24px 8px 6px 8px;font-family:' + SERIF + ';font-size:32px;line-height:1.2;color:' + GREEN + ';">Your ecological garden begins here.</td></tr>');

  // Meta block (EVC / code / address)
  out.push('<tr><td style="padding:18px 8px 6px 8px;">');
  out.push('<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">');
  out.push(metaRow(MONO, SANS, GREEN, MUTED, 'EVC', esc(evc) + (row.evcCode ? ' &nbsp;<span style="color:' + MUTED + ';">(' + esc(row.evcCode) + ')</span>' : '')));
  if (row.address) out.push(metaRow(MONO, SANS, GREEN, MUTED, 'Location', esc(row.address)));
  out.push('</table></td></tr>');

  // Palette label
  out.push('<tr><td style="padding:26px 8px 4px 8px;font-family:' + MONO + ';font-size:11px;letter-spacing:2px;text-transform:uppercase;color:' + GREEN + ';">Your indigenous plant palette</td></tr>');

  // Layers — each rendered as a tinted band that deepens from a pale
  // canopy at the top to a soft green ground layer at the bottom,
  // echoing the vertical structure of the vegetation itself.
  var TINT_TOP = [250, 243, 226];  // pale cream (canopy)
  var TINT_BOTTOM = [199, 224, 173]; // soft green (ground layer)
  for (var g = 0; g < groups.length; g++) {
    var grp = groups[g];
    var t = groups.length > 1 ? g / (groups.length - 1) : 0;
    var tint = lerpColor(TINT_TOP, TINT_BOTTOM, t);
    out.push('<tr><td style="padding:3px 8px;">');
    out.push('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' + tint + ';"><tr><td bgcolor="' + tint + '" style="padding:16px 20px;">');
    if (grp.layer) {
      out.push('<div style="font-family:' + MONO + ';font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:' + GREEN + ';padding-bottom:6px;">' + esc(grp.layer) + '</div>');
    }
    out.push('<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">');
    for (var i = 0; i < grp.items.length; i++) {
      var pl = grp.items[i];
      var last = (i === grp.items.length - 1);
      var border = last ? '' : 'border-bottom:1px solid ' + RULE + ';';
      var slug = plantSlug(pl);
      var hasImg = available && available[slug];
      if (hasImg) showedThumb = true;

      var sci = '<span style="font-family:' + BODYSERIF + ';font-style:italic;font-size:15px;color:' + GREEN + ';">' + esc(pl.name) + '</span>';
      var common = pl.common ? '<span style="font-family:' + SANS + ';font-size:13px;color:' + MUTED + ';">&nbsp; ' + esc(pl.common) + '</span>' : '';

      var thumbCell = hasImg
        ? '<a href="' + resultUrl + '" style="text-decoration:none;"><img src="' + SITE + '/images/plants/' + slug + '.jpg" width="44" height="44" alt="' + esc(pl.common || pl.name) + '" style="display:block;width:44px;height:44px;object-fit:cover;border:0;border-radius:0;"></a>'
        : '<span style="display:block;width:44px;height:44px;"></span>';

      out.push('<tr>' +
        '<td valign="middle" width="44" style="width:44px;padding:8px 12px 8px 0;' + border + '">' + thumbCell + '</td>' +
        '<td valign="middle" style="padding:9px 0;' + border + '"><a href="' + resultUrl + '" style="text-decoration:none;">' + sci + common + '</a></td>' +
        '</tr>');
    }
    out.push('</table></td></tr></table></td></tr>');
  }

  // Grounding note
  out.push('<tr><td style="padding:26px 8px 0 8px;font-family:' + BODYSERIF + ';font-size:15px;line-height:1.6;color:' + MUTED + ';">These species belong to your ground — grown in step with your soils, climate and wildlife for countless generations.</td></tr>');

  // Registry focus block
  out.push('<tr><td style="padding:34px 8px 8px 8px;">');
  out.push('<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:' + GREEN + ';">');
  out.push('<tr><td style="padding:34px 30px;">');
  out.push('<div style="font-family:' + MONO + ';font-size:11px;letter-spacing:2px;text-transform:uppercase;color:' + ACCENT + ';">The Ecological Registry</div>');
  out.push('<div style="font-family:' + SERIF + ';font-size:26px;line-height:1.2;color:' + BEIGE + ';padding:12px 0 10px 0;">Put your garden on the map.</div>');
  out.push('<div style="font-family:' + SANS + ';font-size:14px;line-height:1.6;color:' + BEIGE + ';opacity:0.88;padding-bottom:22px;">When your indigenous garden is planted, register it. Each registered garden becomes part of a living map of restored ground across Victoria — evidence that the landscape is being rebuilt, one plot at a time.</div>');
  // Bulletproof button
  out.push('<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="' + ACCENT + '" style="padding:14px 30px;">');
  out.push('<a href="' + REGISTRY_URL + '" style="font-family:' + MONO + ';font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:' + GREEN + ';text-decoration:none;display:inline-block;">Register your garden &rarr;</a>');
  out.push('</td></tr></table>');
  out.push('</td></tr></table></td></tr>');

  // Photo attribution (CC BY-NC) — only when thumbnails were shown
  if (showedThumb) {
    out.push('<tr><td style="padding:22px 8px 0 8px;font-family:' + MONO + ';font-size:10px;letter-spacing:0.5px;line-height:1.5;color:' + MUTED + ';">Plant photography by <a href="https://www.inaturalist.org" style="color:' + MUTED + ';">iNaturalist</a> contributors, licensed CC BY-NC.</td></tr>');
  }

  // Footer
  out.push('<tr><td style="padding:26px 8px 4px 8px;font-family:' + MONO + ';font-size:11px;letter-spacing:1px;color:' + MUTED + ';">Gardener &amp; Son &nbsp;·&nbsp; Mont Albert &amp; Hawthorn</td></tr>');
  out.push('<tr><td style="padding:0 8px;font-family:' + MONO + ';font-size:11px;letter-spacing:1px;"><a href="https://gardenerandson.com" style="color:' + GREEN + ';text-decoration:none;">gardenerandson.com</a></td></tr>');

  out.push('</table></td></tr></table></body></html>');
  return out.join('');
}

function metaRow(mono, sans, green, muted, label, valueHtml) {
  return '<tr>' +
    '<td valign="top" style="width:96px;padding:4px 0;font-family:' + mono + ';font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:' + muted + ';">' + esc(label) + '</td>' +
    '<td valign="top" style="padding:4px 0;font-family:' + sans + ';font-size:15px;color:' + green + ';">' + valueHtml + '</td>' +
    '</tr>';
}

function groupByLayer(plants) {
  var order = [];
  var map = {};
  plants.forEach(function (pl) {
    var layer = pl.layer || '';
    if (!map[layer]) { map[layer] = []; order.push(layer); }
    map[layer].push(pl);
  });
  return order.map(function (l) { return { layer: l, items: map[l] }; });
}

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Linear interpolation between two [r,g,b] colours → '#rrggbb'.
function lerpColor(a, b, t) {
  return '#' + [0, 1, 2].map(function (i) {
    var v = Math.round(a[i] + (b[i] - a[i]) * t);
    return ('0' + v.toString(16)).slice(-2);
  }).join('');
}

/* ---------- helpers ---------- */

function clean(v, max) {
  if (v === undefined || v === null) return '';
  return String(v).replace(/[<>]/g, '').trim().slice(0, max);
}

function numOrBlank(v) {
  var n = parseFloat(v);
  return isFinite(n) ? n : '';
}

function sanitisePlants(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.slice(0, MAX_PLANTS).map(function (pl) {
    if (typeof pl === 'string') return { name: clean(pl, 120) };
    return {
      layer: clean(pl && pl.layer, 40),
      name: clean(pl && pl.name, 120),
      common: clean(pl && pl.common, 120)
    };
  }).filter(function (pl) { return pl.name; });
}

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Simple GET health check: open the /exec URL in a browser.
function doGet() {
  return respond({ ok: true, service: 'fmeg-plant-gate' });
}

// Run this once from the editor to grant MailApp scope to the deployment.
function authorizeMail() {
  MailApp.sendEmail(REPLY_TO, 'FMEG gate — MailApp auth', 'MailApp scope granted.');
}
