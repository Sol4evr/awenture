# AWenture

Alistair's Learning Adventure. Production baseline: **v6.9.0 Full Visual Authenticity**.

## Release invariant
Every release must be the previous stable production release plus the intended enhancement. Accepted learner/parent features may not silently disappear.

Mandatory release gates include Home, Daily Practice, Parent View, full subject tests, Progress, My Collection, attribution, confidence/conviction, read-aloud, question navigation, saved-progress compatibility, bank integrity, visual integrity, and practice-start smoke testing in WebKit/iPad emulation.

## Immutable v6.9.0 baseline
The exact validated v6.9.0 production HTML is stored as eight small build-source parts under `baseline/`. `npm run build` reconstructs it **at build time**, verifies SHA-256 `0d22f181a4f4d937012a8a69b37c1c565428911bac00bcad3573979e6cdc87f9` and byte length `169116`, then writes the ordinary static learner artifact to `dist/index.html`.

No decoding, decompression or integrity-envelope logic runs on Alistair's device. Vercel serves only `dist`.

The baseline release gate requires 126 unique questions, at least 50 legacy SVG visual markers (validated baseline: 54), the finite shuffle fix, all mandatory learner/parent features, and absence of the failed browser deployment-envelope transport.

## Default release flow
`release/*` branch → pull request → GitHub quality gate + WebKit iPad smoke test → Vercel preview → merge the tested commit to `main` → Vercel production.

`main` is the production source of truth. Direct inline reconstruction should be reserved for emergency rollback/recovery only.
