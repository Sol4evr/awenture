# AWenture

Alistair's Learning Adventure. Production baseline: **v6.9.0 Full Visual Authenticity**.

## Release invariant
Every release must be the previous stable production release plus the intended enhancement. Accepted learner/parent features may not silently disappear.

Mandatory release gates include Home, Daily Practice, Parent, subject tests, Progress, My Collection, attribution, confidence/conviction, read-aloud, question navigation, saved progress compatibility, bank integrity, visual integrity, and practice-start smoke testing in WebKit/iPad emulation.

Vercel should be connected directly to this repository. `main` is production; pull requests receive Vercel previews. Vercel native Git deployment is preferred over inline connector deployment.
