# GitHub Support request — DRAFT, do not submit yet

Submit only after the three complete normal-Git corpora have been uploaded, remote identities verified, all release and preview gates executed successfully, and Arthur has approved the production switch. Current production still depends on the old LFS-backed source.

Subject: Purge obsolete Git LFS objects from Sol4evr/awenture after verified migration

Hello GitHub Support,

We intend to remove the obsolete Git LFS objects associated with https://github.com/Sol4evr/awenture after migrating its complete historical PDF corpus into three normal-Git repositories. Please advise on the purge procedure and confirm exactly which reachable historical LFS objects would be affected before proceeding.

Source index: baseline/historical-corpus-v1-lfs-index.json at commit 7a80d4b80bcadc22ca5486a7ed3a50c133fc0a47.
Immutable original corpus commit: eea48e7df6064b216d26366f2ee5719a573c392e.
Index inventory: 602 PDF paths, 565 unique SHA-256 objects, 1,688,160,711 unique bytes.

Replacement repositories:
- Sol4evr/awenture-corpus-icas
- Sol4evr/awenture-corpus-naplan
- Sol4evr/awenture-corpus-oc

Before submission, append verified remote corpus commit SHAs, released app commit SHA, and evidence that both the learner-safe proxy and Year 2 build materializer consume only the normal-Git replacements. Historical app commits will still contain LFS pointers, so old-version rebuild consequences must be documented.

Please confirm completion and the resulting LFS storage accounting. We will not treat deletion of active pointers as evidence that remote storage has been purged.

Thank you,
Arthur Wang
