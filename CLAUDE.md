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

## Access model (EVERY app — existing and new)
- All apps use the same **role + roster** model. Full spec:
  `access-model/ADOPTED-STANDARD.md`. Reference impl: AutoFlag's PIECE2/PIECE3.
- Roster lives at `{app}/people/{emailKey}` (Taskboard uses `{app}/access/{emailKey}`
  because `taskboard/people` already means assignee names). Record =
  `{ email, role, … }`; `role ∈ admin | moderator | user | customer | installer`
  (use only the roles an app needs).
- `emailKey` = email lowercased with the **6× `.replace('.','_')`** chain in
  rules (RTDB `.replace()` is first-occurrence-only — one call is NOT enough).
  Keep it matched to the client's `emailToKey`.
- Two ROOT admin UIDs hardcoded in client AND rules as lockout insurance:
  `CuJigrzCbRfFFsM7uqe0mix46xH3`, `g4stabGPKiWAE23NTw6oUsqawWf1`.
- Rules check role **inline** by reading the roster; **grant at the LEAF**, never
  an app's top level (a parent grant cascades and can't be revoked). Per-tenant
  isolation scopes reads at the `$id` level.
- Client resolves its own role by reading its OWN roster record and **bounces
  null-role users** (sign out anyone not root and not on the roster).
- **New apps:** don't invent a model — copy AutoFlag's pattern, gate the data,
  and follow `RULES-COORDINATION.md`.

## Sign-in (EVERY app)
- Offer **BOTH** Google **and** email+password, mirroring AutoFlag. Spec:
  `access-model/SIGNIN-STANDARD.md`.
- Access is email-keyed, so the sign-in method is interchangeable — adding
  email+password is a CLIENT-only change; no rules/roster change. The
  Email/Password provider is already enabled on `philinity-893d2`.

## UI / footer (EVERY app)
- Every app MUST match `access-model/UI-STANDARD.md`. Footer, exact format:
  `v{REV} · 📦 Data · 📜 History · 👥 People · {Name} ★ · 🚪 Sign Out`
  (version auto-injected from the meta tag; 📦 Data + 👥 People admin-only;
  ★ shows for admins; Sign Out always). Plus the Google+email/password sign-in
  screen and the 👥 People / 📦 Data / 📜 History surfaces.

## Rollout sequencing — DEFAULT (don't ask; follow this unless the app's spec says otherwise)
When hardening an app's access (or any matched client+rules change), use the
proven AutoFlag staging — and do it in one session, full scope:
1. Build the CLIENT (roster gate / role resolution / role-gated UI / People
   modal) and bump the rev. Safe under the app's CURRENT rules — building the
   gate doesn't lock anyone out.
2. Edit ONLY that app's block in `PIECE3-rules-to-deploy.json`.
3. Open ONE PR (client repo) + note the rules change; share the link.
4. Deploy order is the user's, and it's CLIENT -> verify -> RULES: ship the
   client live first, confirm all roles work, THEN paste the rules in the
   Firebase console. NEVER deploy rules before the client gate is live (lockout).
5. Probe-verify each role like AutoFlag did.
- You (the bot) cannot deploy rules — that's the user's console paste. "Full
  scope" = build client + edit the rules block; the user deploys.
- Default to this. Only ask the user when the app's ROLES or DATA-SCOPING aren't
  defined (no rollout spec) — that's a product decision; the staging is not.

## Pull-request hygiene
- Open a PR per unit of work and SHARE THE LINK as soon as you push.
- Do NOT push commits expecting them to attach to an already-merged PR. If the
  previous PR is merged, open a NEW PR immediately.
- Never create a PR unless asked; flag any force-push of a shared branch.
