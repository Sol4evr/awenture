# AWenture source-corpus structure

This directory separates raw/reference papers from derived calibration assets and learner-facing generated content.

## Canonical raw-paper locations

### ICAS
- `source/original-icas/year2/{english,mathematics,science,spelling}`
- `source/original-icas/year3/{Digital,English,Math,Science,Spelling,Writing}`
- `source/original-icas/year4/{Digital,English,Math,Science,Spelling,Writing}`

Upload original PDFs unchanged. Historical papers remain isolated from generated Daily Practice.

### NAPLAN
- `source/Naplan/Year 3/`
- `source/Naplan/Year 5/`

Keep original NAPLAN PDFs unchanged and preserve filenames where possible. Year 3 supports the current progression stage; Year 5 is retained as the next higher-year reference corpus for later calibration and progression expansion.

### Opportunity Class (OC)
- Official/sample papers: `source/oc/official/{2021,2022,2023,2024}/{reading,mathematical-reasoning,thinking-skills}`
- Braintree 2024: `source/oc/commercial/braintree/2024/sitting-{1,2,3}/{reading,mathematical-reasoning,thinking-skills}`

Keep question papers linked to their answer keys/worked explanations through filenames; raw sources do not enter the live learner bank until reconciled and approved.

## Derived spelling assets

Derived Year 2 spelling calibration/formal-paper metadata lives under `source/original-icas/year2/spelling/_derived/`. The canonical 2016 spelling PDF lives in `source/original-icas/year2/spelling/`.

## Upload rules
1. Upload PDFs as binary files; do not convert, OCR, split or re-save them first.
2. Keep answer keys/analysis with their source paper bundle.
3. Do not place generated questions in these raw-source folders.
4. New source material must pass ingestion, provenance, orientation/layout and QA checks before it can influence calibration or learner-facing content.
5. Quarantined or unresolved source material must not influence the question generator.
