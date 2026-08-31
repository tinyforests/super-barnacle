# Plant images — remaining gaps

Plant hover/modal/email images live in `images/plants/<common-name-slug>.jpg`
and are sourced by `scripts/fetch-plant-images.py` from iNaturalist
(CC-licensed, matched by scientific name). Current coverage: ~98%.

## Species still without an image

iNaturalist had no Creative-Commons photo, or resolved only to genus level.
These render as a clean spacer (no broken image) until a photo is added.

| Slug (filename) | Species | Common name | Reason |
|---|---|---|---|
| `bristly-wallaby-grass` | Austrodanthonia setacea | Bristly Wallaby-grass | genus-only match (Rytidosperma) |
| `striped-wallaby-grass` | Austrodanthonia racemosa | Striped Wallaby-grass | genus-only match (Rytidosperma) |
| `common-plume-grass` | Dichelachne rara | Common Plume-grass | no CC photo |
| `noahs-ark` | Poa clelandii | Noah's Ark | no CC photo |
| `swamp-tussock-grass` | Poa helmsii | Swamp Tussock-grass | no CC photo |
| `tussock-grass` | Poa australis spp. agg. | Tussock Grass | aggregate name, no species match |

## To fill a gap

Drop a suitably-licensed JPG at `images/plants/<slug>.jpg` (square-ish crops
look best at the 44px thumbnail size), then regenerate the site manifest:

```bash
python3 scripts/fetch-plant-images.py   # only fetches what's still missing,
                                        # and rewrites images/plants/manifest.json
```

If you add photos manually, remember to add a credit row to
`scripts/plant-image-attributions.csv` and re-run the script (or hand-edit
`manifest.json`) so the email/app know the image exists.
