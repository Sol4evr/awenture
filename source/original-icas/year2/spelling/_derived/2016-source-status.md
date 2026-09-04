# ICAS Year 2 Spelling — 2016 source status

The authorised source supplied for AWenture is the 2016 ICAS Introductory Spelling paper for Australian Year 2.

For v6.16.1, AWenture deploys the written **Section B only** because the supplied source does not contain the original listening/dictation delivery material for Section A. The formal test therefore contains original Questions **16–30**, for **15 questions in 25 minutes**, with the original numbering preserved.

A validated compact derivative containing source pages 2, 3 and the analysis page is stored in Git-safe base64 payload parts under `source/spelling/year2/2016-section-b-payload/`. At build time its byte length and SHA-256 are verified, then it is reconstructed as an ordinary PDF. The first two pages become the timed `2016-questions.pdf`; the analysis page becomes the post-submission `2016-answers.pdf`.

No Section A questions or audio are fabricated. Generated AWenture audio spelling questions in Daily Practice remain a separate source-calibrated question bank and are not represented as original 2016 ICAS content.
