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
var SHEET_ID = '';                    // leave blank if script is bound to the sheet
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

  MailApp.sendEmail({
    to: row.email,
    subject: subject,
    body: body,
    name: FROM_NAME,
    replyTo: REPLY_TO
  });
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
