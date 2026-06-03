# New-app access playbook (universal — for ANY app, existing or new)

The one-stop for rolling out access to any app in the `philinity-893d2` project.
If you're an app-bot adding the People/roster feature, follow this end to end.

## 0. Session setup (do this FIRST)
Your session MUST mount **two repos**: the **app's repo** AND
**`siglerventures/autoflag-installs`** (this repo). Reasons:
- The shared rules file you must edit — `access-model/PIECE3-rules-to-deploy.json`
  — lives here, not in the app repo.
- The standards (`ADOPTED-STANDARD.md`, `SIGNIN-STANDARD.md`,
  `RULES-COORDINATION.md`) and this playbook live here.
If `autoflag-installs` is not mounted, stop and tell the user to add it to the
session — you can't do the rules half without it.

## 1. The model (don't reinvent — copy AutoFlag)
- **Roles:** `admin / moderator / user` by default (shared app). Add
  `customer` / `installer` only if the app has tenant data to isolate.
  - admin: full access incl. People modal + Data tools.
  - moderator: elevated edit rights, NO People/Data admin.
  - user: normal use.
- **Roster:** `{app}/people/{emailKey}` = `{ email, role, name, addedAt, addedBy }`.
  (If the app already uses `{app}/people` for something else — e.g. assignee
  names — use `{app}/access/{emailKey}` instead.)
- **`emailKey`:** lowercase + the 6× `.replace('.','_')` chain in rules (RTDB
  `.replace()` is first-occurrence-only). Match the client's `emailToKey`.
- **Root UIDs** (always admin, lockout insurance), in client AND rules:
  `CuJigrzCbRfFFsM7uqe0mix46xH3`, `g4stabGPKiWAE23NTw6oUsqawWf1`.

## 2. Client changes (the app's index.html)
1. `emailToKey(email)` helper (mirror AutoFlag).
2. `resolveAccess()` / role resolution: on sign-in, root UID → admin; else read
   the user's OWN `{app}/people/{ek}` record for the role; **bounce null-role
   users** (sign out anyone not root and not on the roster).
3. Role-gated UI: hide admin-only controls (People modal, Data tools) for
   non-admins; gate moderator features.
4. **People/Access admin modal**: add / edit / remove users by **email + role**,
   writing `{app}/people/{ek}`.
5. **Sign-in:** offer **Google AND email+password** (`SIGNIN-STANDARD.md`).
6. **Version:** single source of truth — `<meta name="app-rev">` + runtime
   injection; bump it (refactor away any hard-coded version first).

## 3. Rules (this repo: `PIECE3-rules-to-deploy.json`)
- Change **ONLY the app's top-level block**; every other app's block stays
  byte-for-byte (`git diff origin/main` to prove it). See `RULES-COORDINATION.md`.
- Pattern (email-key-in-rules, ADOPTED): role read inline from the roster,
  **granted at the LEAF**, never the app's top level. Roster `people` =
  admin-only write + own-record read. Shared data nodes = members read/write;
  admin-only nodes (destructive import/restore) stay admin.

## 4. Rollout & deploy (matched-pair — see CLAUDE.md "Rollout sequencing")
1. Build the CLIENT + bump rev → PR (app repo). Safe under current rules.
2. Edit the app's rules block → its OWN PR (this repo). **Hold it unmerged** if
   another app's rules are already staged-but-undeployed in PIECE3 (don't bundle
   deploys). The user deploys CLIENT → verify → RULES (console paste).
3. Seed the roster (admin adds people via the modal).
4. Probe-verify each role (non-roster denied; user/mod/admin behave correctly).

## 5. Kickoff template (user pastes this to a new app-bot)
> Roll out role-based access to **<APP>** (`siglerventures/<repo>`). This session
> also mounts `autoflag-installs`; follow `access-model/NEW-APP-PLAYBOOK.md`.
> Roles **admin/moderator/user**, shared (no per-user data isolation unless I say
> so). Build the client (emailToKey + role resolution + null-role bounce +
> People modal + **Google and email+password** sign-in + move version to the
> app-rev meta and bump). Edit ONLY the `<app>` block in
> `PIECE3-rules-to-deploy.json` in its own PR (hold unmerged if another app's
> rules are pending deploy). Branch + PR per repo; deploy is client → verify →
> rules. If the app's roles or data-scoping are unclear, ask me — otherwise
> proceed full scope.
