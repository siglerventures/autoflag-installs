# Eats rollout — spec & kickoff

> ⚠️ Session must mount **`siglerventures/eats` + `autoflag-installs`**. Follow
> `access-model/NEW-APP-PLAYBOOK.md` and `RULES-COORDINATION.md` (rules are ONE
> shared file — change only the `eats` block).

Eats lives at `siglerventures/eats` (GitHub Pages). Same Firebase project
(`philinity-893d2`).

## Current state (from source analysis)
| Aspect | Now | Target |
|---|---|---|
| Roster | none | `eats/people/{emailKey}` = `{ email, role, … }` |
| Rules (`eats` block) | `.read`/`.write` = the 2 root UIDs only | role read inline from roster, granted at leaf |
| "People" footer | none | admin modal to add/edit/remove users + roles |
| Sign-in | Google only | Google + email/password (`SIGNIN-STANDARD.md`) |
| Version | hard-coded Rev 11.12 in 2 spots | `<meta name="app-rev">` + runtime inject |

## Locked design (confirmed with Phil)
- **Roles: admin / moderator / user — SHARED app** (no per-user data isolation;
  everyone authorized uses the same Eats data). Roles gate admin/edit rights:
  - **admin**: full access incl. People footer + any Data tools.
  - **moderator**: elevated edit, NO People/Data admin.
  - **user**: normal use.
- Root UIDs always admin (lockout insurance).
- "People footer" = an admin modal to add/edit/remove users by **email + role**.

## Client changes (`eats/index.html`)
1. `emailToKey` + role resolution from `eats/people/{ek}` on sign-in; **bounce
   null-role users**. Replace the current root-UID-only gate.
2. **People modal** (admin only) → writes `eats/people/{ek}`.
3. Role-gated UI (hide People/Data for non-admins).
4. **Google + email+password** sign-in (mirror AutoFlag).
5. Move the hard-coded **Rev 11.12** to the `app-rev` meta-tag pattern; bump it.

## Rules (`eats` block of `PIECE3-rules-to-deploy.json`)
- `eats/people`: admin read (+ own-record read for role resolution); admin write.
- `eats` shared data: members (admin/mod/user) read + write; root UIDs always.
- Grant at the LEAF; admin-only for any destructive whole-node import/restore.
- Change ONLY the `eats` block; keep all others byte-identical.

## Deploy staging (IMPORTANT)
Taskboard's hardened rules are already in `main`'s PIECE3 but **pending console
deploy**. So **keep the Eats rules change in its OWN PR and do NOT merge it**
until the Eats client is live — otherwise the next console paste ships
taskboard + eats together. Deploy Eats on its own: client live → verify → paste
rules. (Whoever does the next paste must confirm taskboard's client is live,
since taskboard's rules are already loaded in PIECE3.)

## Verify
- A logged-in account NOT in `eats/people` → denied.
- user → normal use; cannot open People; cannot write `eats/people`.
- moderator → edit rights; no People/Data admin.
- admin → everything, incl. People modal.

## Kickoff
> Roll out role-based access to Eats (`siglerventures/eats`) per
> `access-model/EATS-rollout-spec.md` (session also mounts autoflag-installs).
> Roles admin/moderator/user, shared. Build the client (emailToKey + role
> resolution + null-role bounce + People modal + Google and email+password
> sign-in + move Rev 11.12 to the app-rev meta and bump). Edit ONLY the `eats`
> block in PIECE3 in its own PR and HOLD it unmerged until the Eats client is
> live (don't bundle with taskboard's pending deploy). Branch + PR per repo.
