/* ============================================================
   FMEG Email Gate — Apps Script backend
   Gardener & Son · findmyecologicalgarden.com

   Deploy as Web App:
     Execute as: Me
     Who has access: Anyone

   Receives POST from fmeg-gate.js with payload:
     email, address, lat, lng, evc_code, evc_name,
     source, referrer, page, plants[]

   Logs one row per submission to the 'submissions' tab
   of the FMEG leads sheet.

   After pasting, deploy a NEW version each time you edit:
   Deploy → Manage deployments → New version.
   The /exec URL stays the same.
   ============================================================ */

var SHEET_ID  = '1w_H8aplOy-qtR18zXWUfAXl-suRFyW4ugdoQzjr5Tn0';
var SHEET_TAB = 'submissions';

var HEADERS = [
  'timestamp', 'email', 'address', 'lat', 'lng',
  'evc_code', 'evc_name', 'source', 'referrer', 'page',
  'plant_count', 'plants'
];

/* ---- Health check ---- */
function doGet() {
  return jsonResp({ status: 'FMEG gate endpoint live', timestamp: new Date().toISOString() });
}

/* ---- Gate submission handler ---- */
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);

    // Honeypot — silent reject so bots get no signal
    if (payload.website) {
      return jsonResp({ ok: true });
    }

    var email = safeStr((payload.email || '').toLowerCase().trim(), 254);
    if (!email) {
      return jsonResp({ ok: false, error: 'email required' });
    }

    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var sheet = ss.getSheetByName(SHEET_TAB);

    if (!sheet) {
      return jsonResp({ ok: false, error: 'submissions tab not found' });
    }

    // Write headers on first use
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
    }

    var plants      = payload.plants || [];
    var plantNames  = plants.map(function(p) {
      return (p.name || '') + (p.common ? ' (' + p.common + ')' : '');
    }).join('; ');

    sheet.appendRow([
      new Date().toISOString(),
      email,
      safeStr(payload.address  || '', 200),
      payload.lat || '',
      payload.lng || '',
      safeStr(payload.evc_code || '', 20),
      safeStr(payload.evc_name || '', 120),
      safeStr(payload.source   || '', 50),
      safeStr(payload.referrer || '', 500),
      safeStr(payload.page     || '', 500),
      plants.length,
      safeStr(plantNames, 2000)
    ]);

    return jsonResp({ ok: true });

  } catch (err) {
    return jsonResp({ ok: false, error: err.message });
  }
}

/* ---- Helpers ---- */
function safeStr(v, maxLen) {
  var s = String(v == null ? '' : v).trim();
  if (s.length > (maxLen || 500)) s = s.slice(0, maxLen || 500);
  return /^[=+\-@|]/.test(s) ? ("'" + s) : s;
}

function jsonResp(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
