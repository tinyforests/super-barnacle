#!/usr/bin/env python3
"""
Fetch plant hover-preview images for Find My Ecological Garden.

Sources the research-grade, CC-licensed default photo for each plant in
curated-plants.json from the iNaturalist API, keyed by SCIENTIFIC name
(safer than common name), and saves it to images/plants/<slug>.jpg where
<slug> is the common-name slug that checkPlantImage() in evc-fetch.js expects.

- Only Creative-Commons-licensed photos are downloaded (all-rights-reserved skipped).
- The matched taxon genus must equal the queried genus (guards against mis-ID).
- Existing images are never overwritten.
- Every download is recorded in scripts/plant-image-attributions.csv for credit.

Rerunnable: only fetches what's missing. Rate-limited to respect iNat policy.
"""
import urllib.request, urllib.parse, json, os, re, time, csv, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLANTS_JSON = os.path.join(ROOT, "curated-plants.json")
IMG_DIR = os.path.join(ROOT, "images", "plants")
MANIFEST = os.path.join(ROOT, "scripts", "plant-image-attributions.csv")
UA = "FindMyEcologicalGarden/1.0 (hello@lundbech.me)"
CC_OK = {"cc0", "cc-by", "cc-by-sa", "cc-by-nc", "cc-by-nc-sa", "cc-by-nd", "cc-by-nc-nd"}
QUALIFIERS = {"s.l.", "s.s.", "s.str.", "spp.", "sp.", "agg.", "aff."}
DELAY = 1.1  # seconds between API calls (iNat asks <=60/min)


def slug(plant):
    m = re.search(r"\(([^)]+)\)", plant)
    name = m.group(1).strip() if m else plant
    return name.lower().replace(" ", "-").replace("'", "").replace("’", "")


def sci_query(plant):
    """Scientific name for lookup: strip common name and qualifier tokens."""
    raw = plant.split("(")[0].strip()
    toks = [t for t in raw.split() if t not in QUALIFIERS]
    return " ".join(toks)


def common_name(plant):
    m = re.search(r"\(([^)]+)\)", plant)
    return m.group(1).strip() if m else ""


def build_targets():
    d = json.load(open(PLANTS_JSON))
    seen = {}
    for ev in d["evcs"].values():
        for rec in ev.get("recommendations", []):
            for p in rec.get("plants", []):
                s = slug(p)
                seen.setdefault(s, {"sci": sci_query(p), "common": common_name(p)})
    return seen


def inat_lookup(name):
    url = "https://api.inaturalist.org/v1/taxa?" + urllib.parse.urlencode(
        {"q": name, "per_page": 1}
    )
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    r = json.load(urllib.request.urlopen(req, timeout=30))
    return r["results"][0] if r["results"] else None


def inat_taxon(tid):
    url = f"https://api.inaturalist.org/v1/taxa/{tid}"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    r = json.load(urllib.request.urlopen(req, timeout=30))
    return r["results"][0] if r["results"] else None


def norm_epithet(w):
    # strip Latin gender/declension endings so caespitosa == caespitosum
    return re.sub(r"(us|um|a|is|e|i|ii)$", "", w.lower())


def accepts(taxon, sci, common):
    """True if the matched taxon is the same plant (allowing genus synonyms)."""
    if taxon.get("rank") not in ("species", "subspecies", "variety", "genus", "hybrid"):
        return False
    sw, tw = sci.split(), taxon["name"].split()
    if tw[0].lower() == sw[0].lower():
        return True  # genus matches
    # genus reassigned (synonym): confirm via species epithet or common name
    if len(sw) >= 2 and len(tw) >= 2:
        ne = norm_epithet(sw[1])
        if ne and ne == norm_epithet(tw[1]):
            return True
    pcn = (taxon.get("preferred_common_name") or "").lower()
    if common and pcn and pcn == common.lower():
        return True
    return False


def medium_url(photo):
    u = photo.get("medium_url") or photo.get("url") or ""
    return u.replace("square", "medium") if u else ""


def pick_cc_photo(taxon):
    """Prefer the default photo if CC; else scan the taxon's gallery for one."""
    dp = taxon.get("default_photo") or {}
    if dp.get("license_code") in CC_OK:
        return medium_url(dp), dp.get("license_code"), dp.get("attribution")
    time.sleep(DELAY)
    detail = inat_taxon(taxon["id"])
    for tp in (detail or {}).get("taxon_photos", []):
        ph = tp.get("photo") or {}
        if ph.get("license_code") in CC_OK:
            return medium_url(ph), ph.get("license_code"), ph.get("attribution")
    return None, dp.get("license_code"), None


def fetch_one(name, common):
    """Return (photo_url, license, attribution, matched_name) or (None, reason,...)."""
    taxon = inat_lookup(name)
    if not taxon and len(name.split()) > 2:  # retry as genus+species
        time.sleep(DELAY)
        taxon = inat_lookup(" ".join(name.split()[:2]))
    if not taxon and len(name.split()) > 1:  # last resort: genus only
        time.sleep(DELAY)
        taxon = inat_lookup(name.split()[0])
    if not taxon:
        return None, "no-result", None, None
    if not accepts(taxon, name, common):
        return None, f"no-match({taxon['name']})", None, None
    url, lic, attr = pick_cc_photo(taxon)
    if not url:
        return None, f"no-cc-license({lic})", None, taxon["name"]
    return url, lic, attr, taxon["name"]


def main():
    targets = build_targets()
    have = {f[:-4] for f in os.listdir(IMG_DIR) if f.endswith(".jpg")}

    # remove orphan images for plants no longer in the data (e.g. removed species)
    orphans = have - set(targets)
    for o in sorted(orphans):
        os.remove(os.path.join(IMG_DIR, o + ".jpg"))
        print(f"REMOVED orphan  {o}.jpg")

    missing = sorted(s for s in targets if s not in have)
    print(f"{len(targets)} slots | {len(have & set(targets))} present | {len(missing)} to fetch\n")

    rows = []
    ok = skip = 0
    for i, s in enumerate(missing, 1):
        name = targets[s]["sci"]
        common = targets[s]["common"]
        try:
            purl, lic, attr, matched = fetch_one(name, common)
        except Exception as e:
            purl, lic, attr, matched = None, f"error({e})", None, None
        if purl:
            try:
                req = urllib.request.Request(purl, headers={"User-Agent": UA})
                data = urllib.request.urlopen(req, timeout=60).read()
                open(os.path.join(IMG_DIR, s + ".jpg"), "wb").write(data)
                ok += 1
                rows.append([s, name, matched, lic, attr, purl])
                print(f"[{i}/{len(missing)}] OK   {s:32s} <- {matched} ({lic})")
            except Exception as e:
                skip += 1
                print(f"[{i}/{len(missing)}] FAIL {s:32s} download error: {e}")
        else:
            skip += 1
            print(f"[{i}/{len(missing)}] SKIP {s:32s} {lic}")  # lic holds the reason
        time.sleep(DELAY)

    write_header = not os.path.exists(MANIFEST)
    with open(MANIFEST, "a", newline="") as f:
        w = csv.writer(f)
        if write_header:
            w.writerow(["filename", "queried", "matched_taxon", "license", "attribution", "source_url"])
        for r in rows:
            w.writerow([r[0] + ".jpg"] + r[1:])

    # Site manifest: slugs the email/app can rely on existing (read by Code.gs).
    slugs = sorted(f[:-4] for f in os.listdir(IMG_DIR) if f.endswith(".jpg"))
    json.dump(slugs, open(os.path.join(IMG_DIR, "manifest.json"), "w"))
    print(f"\nDone. Downloaded {ok}, skipped {skip}. "
          f"{len(slugs)} images in manifest. Attributions -> {MANIFEST}")


if __name__ == "__main__":
    main()
