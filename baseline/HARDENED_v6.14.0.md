# AWenture Hardened Baseline v6.14.0

This release freezes the current accepted learner experience as the reference baseline for future changes.

## Immutable learning core
- Base learning/domain core remains v6.9.0 and is rebuilt from the existing integrity-checked baseline parts.
- Normal practice bank: 171 questions, 57 each English / Mathematics / Science.
- Bonus bank: 9 Difficulty 5 questions, isolated from normal mastery.
- Daily Practice targets 3 validated visual questions, maximum 4; M09, M18, M19, M23, M26 and M31 remain quarantined.

## Accepted learner experience
- Home learning path: ICAS Y2 → ICAS Y3 → NAPLAN Y3 → ICAS Y4 → OC.
- Standalone Progress tile removed.
- Parent View uses full subject and subskill performance spectra.
- My Collection contains six governed achievements.
- Historical ICAS Year 2 formal papers use the dedicated PDF.js viewer, question-only timed assets, gesture-first touch controls and isolated formal history.

## Hardening changes
- Superseded generated Paper A/B/C formal runtime removed from learner HTML.
- Superseded generated formal manifest removed.
- Old OCR / inspection / copy utilities removed from active repository surface.
- Superseded v1-v3 expansion validators removed; v4 is the sole active expansion validator.
- Release gate explicitly fails if the removed generated-form runtime or obsolete utilities return.

## Release rule
Future releases must preserve this baseline unless the intended release explicitly changes an accepted feature. Static/content validation and browser validation in WebKit/iPad-like and Chromium must pass on the exact release candidate before promotion. The matching Vercel preview must also be READY on that same candidate SHA.
