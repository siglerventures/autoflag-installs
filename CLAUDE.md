# AutoFlag-Installs — conventions for Claude Code (read before editing)

Two things live in this repo:
1. The **AutoFlag app** (`index.html`) — customer/installer tracking, Firebase
   Realtime Database, Google sign-in, hosted on GitHub Pages.
2. The **shared Firebase rules + access-model governance** (`access-model/`).

## Versioning — SINGLE SOURCE OF TRUTH (the AutoFlag app)
- Define the version ONCE: `<meta name="app-rev" content="X.Y">` in `index.html`.
- The footer (`vX.Y`) should be filled from that meta tag at runtime — never
  hard-code the version in multiple spots. If it is still hard-coded, refactor
  to the meta-tag + `DOMContentLoaded`-injection pattern first.
- The cache-bust bootstrap reads the same meta tag (localStorage key
  `af_lastRev`).
- **Every change to client code MUST bump the meta tag.** That is how we confirm
  the new `index.html` is actually live.

## Cache-bust
- Keep the cache-bust bootstrap so a version bump reaches users without a manual
  hard-refresh.

## Firebase Realtime Database rules (THE deployable)
- `access-model/PIECE3-rules-to-deploy.json` is the SINGLE ruleset for ALL apps
  (autoflag, taskboard, veritas, …). RTDB allows only one ruleset per database.
- Change ONLY the relevant app's block; keep every other block byte-identical
  (diff against `origin/main` to prove the blast radius).
- Follow the email-key-in-rules ADOPTED standard
  (`access-model/ADOPTED-STANDARD.md`).
- Update `access-model/RULES-COORDINATION.md`, and do NOT run two app rules
  rollouts in parallel.
- `not-adopted/` holds the quarantined UID-mirror design — it is NOT deployable.
- Deploy = paste the WHOLE PIECE3 file into the Firebase console (Realtime
  Database → Rules → Publish). Merging to `main` does NOT auto-deploy.

## Pull-request hygiene
- Open a PR per unit of work and SHARE THE LINK as soon as you push.
- Do NOT push commits expecting them to attach to an already-merged PR. If the
  previous PR is merged, open a NEW PR immediately.
- Never create a PR unless asked; flag any force-push of a shared branch.
