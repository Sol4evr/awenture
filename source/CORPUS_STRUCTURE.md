# AWenture source-corpus structure

This directory separates raw/reference papers from derived calibration assets and learner-facing generated content.

## Canonical raw-paper locations

### ICAS
- `source/original-icas/year2/{english,mathematics,science,spelling}`
- `source/original-icas/year3/{english,mathematics,science,spelling}`
- `source/original-icas/year4/{english,mathematics,science,spelling}`

Upload original PDFs unchanged. Historical papers remain isolated from generated Daily Practice.

### NAPLAN
- Official ACARA: `source/naplan/official-acara/year{3,5,7,9}/{language-conventions,reading,numeracy,writing}`
- NQT practice papers: `source/naplan/nqt-practice/year{3,5,7,9}`

The ACARA structure is designed for the previously collected 2008–2016 paper sets, including test papers, answers, reading magazines and writing prompts. Preserve original filenames where possible.

### Opportunity Class (OC)
- Official/sample papers: `source/oc/official/{2021,2022,2023,2024}/{reading,mathematical-reasoning,thinking-skills}`
- Braintree 2024: `source/oc/commercial/braintree/2024/sitting-{1,2,3}/{reading,mathematical-reasoning,thinking-skills}`

Keep question papers linked to their answer keys/worked explanations through filenames; raw sources do not enter the live learner bank until reconciled and approved.

## Derived spelling assets

`source/spelling/year2` is retained intentionally as derived calibration/formal-paper metadata. It is not a second raw-paper location. The canonical 2016 spelling PDF lives only under `source/original-icas/year2/spelling/`.

## Upload rules
1. Upload PDFs as binary files; do not convert, OCR, split or re-save them first.
2. Keep answer keys/analysis with their source paper bundle.
3. Do not place generated questions in these raw-source folders.
4. New source material must pass ingestion, provenance, orientation/layout and QA checks before it can influence calibration or learner-facing content.
5. Quarantined or unresolved source material must not influence the question generator.
