# AWenture source-corpus structure

This directory separates raw/reference papers from derived calibration assets and learner-facing generated content.

## Canonical raw-paper locations

### ICAS
- `source/original-icas/year2/` retains the existing Year 2 production corpus.
- `source/original-icas/year3/{Digital,English,Math,Science,Spelling,Writing}`
- `source/original-icas/year4/{Digital,English,Math,Science,Spelling,Writing}`

Upload original PDFs unchanged into the matching subject folder. Historical papers remain isolated from generated Daily Practice until they have been ingested, reconciled and approved.

### NAPLAN
- `source/naplan/Year 3/`

Year 3 is the NAPLAN stage used by the current AWenture learning progression. Upload the collected Year 3 NAPLAN PDFs here unchanged; source/type/subject classification is handled during ingestion rather than by a pre-emptive folder split.

### Opportunity Class (OC)
- Official/sample papers: `source/oc/official/{2021,2022,2023,2024}/{reading,mathematical-reasoning,thinking-skills}`
- Braintree 2024: `source/oc/commercial/braintree/2024/sitting-{1,2,3}/{reading,mathematical-reasoning,thinking-skills}`

Keep question papers linked to their answer keys/worked explanations through filenames; raw sources do not enter the live learner bank until reconciled and approved.

## Year 2 spelling cleanup

The old top-level `source/spelling/year2` location has been retired. Its non-PDF calibration/formal-paper artifacts were moved under `source/original-icas/year2/spelling/_derived/`. The canonical raw 2016 spelling PDF remains at `source/original-icas/year2/spelling/2016 Spelling Year 2- With   Answer.pdf`.

## Upload rules
1. Upload PDFs as binary files; do not convert, OCR, split or re-save them first.
2. Keep answer keys/analysis with their source paper bundle.
3. Do not place generated questions in these raw-source folders.
4. New source material must pass ingestion, provenance, orientation/layout and QA checks before it can influence calibration or learner-facing content.
5. Quarantined or unresolved source material must not influence the question generator.
