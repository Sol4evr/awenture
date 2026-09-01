# Authorised ICAS Year 2 original-paper mode

The source papers are user-owned/authorised and originate from the uploaded `ICAS Batch 1.zip` archive.

## Release rules

1. Original-paper mode is separate from AWenture-generated ICAS-style practice and mastery evidence.
2. Each formal paper is identified by `subject + source year`; no artificial A/B/C reshuffling.
3. The original source-paper page artwork must be preserved rather than OCR-recreated when the binary source is available to the build.
4. Every source PDF is pinned by SHA-256 in `icas-y2-original-papers.json`.
5. No source fingerprint may be registered twice.
6. No formal question identity may appear in more than one formal paper. The release gate must fail on any overlap.
7. Scores, elapsed time, timeout state, source year and paper identity are stored separately from Daily Practice/Bonus/mastery evidence.
8. Answer keys must be bound to the exact source-year paper before that paper can be exposed in the learner UI.
9. A paper without its exact binary/page asset or validated answer key remains unavailable; no fallback to recycled AWenture-bank questions.

## Intended learner UI

Formal Tests -> subject -> historical year (for example 2018, 2019, 2020) -> original paper player.

The player retains the v6.13 formal-test shell (timer, navigation, answer palette, deferred marking and auto-submit) while showing the authorised original paper pages as the assessment content.
