# Veritas rollout — spec & kickoff (for a session WITH veritas repo access)

Veritas lives at `siglerventures/veritas` (GitHub Pages →
https://siglerventures.github.io/veritas/). Same Firebase project as AutoFlag
(`philinity-893d2`).

## Key finding: the CLIENT is already done — the RULES are the gap
Unlike Taskboard, Veritas already ships the full role model in `index.html`:
- `ROOT_ADMIN_UIDS = [PHIL_UID]` (root admin, lockout insurance).
- Roles **admin / moderator / user**, resolved by `resolveRole(user)` which reads
  `veritas/people/{emailKey}` (Phil → admin; else stored role; else null).
- Permission helpers: `isAdmin()`, `isModerator()`, `canModerate()` (admin|mod),
  `canAddPeople()` (admin), `canDataManage()` (admin).
- In-app **People modal** (admin adds people by email+role → `veritas/people/{ek}`)
  and **Data modal** (export/restore, admin only). Footer rev pill (~Rev 6.14).
- UI is gated by role already (People/Data buttons hidden unless admin; edit
  cats / add cat / acknowledge gated by `canModerate()`).

**THE HOLE:** the Firebase rules are currently
`"veritas": { ".read": "auth != null", ".write": "auth != null" }`
— so **any** authenticated Google account (not just roster members) has full
read/write to all Veritas data. The client hides things by role, but the
database enforces nothing. This is the same "UI-only" gap we closed for AutoFlag.

## Data model (shared — no per-user isolation)
`veritas` = `{ sessions:{...}, categories:{...}, acknowledged:{...}, people:{...} }`
- All roster members **see everything** (History shows all sessions). Roles gate
  *who can edit*, not *who can see*.
- Write patterns observed:
  - `veritas/people/{ek}` — add/remove access (admin only).
  - `veritas/categories` — edit categories (canModerate).
  - `veritas/acknowledged/{id}` — acknowledge facts (canModerate).
  - `veritas/sessions/{id}` — created/updated by **any** member running a query;
    editing category / deleting a session is gated client-side to canModerate.
  - `veritas` (whole) — Data-modal restore writes the whole node (admin only).

## What to do: harden the rules to match the client
Replace the wide-open `veritas` block. Push read/write down per subtree (so
`people` can stay admin-only despite shared reads elsewhere — same cascade
lesson as AutoFlag). Use Veritas's own `emailKey()` transform and `PHIL_UID`.
(Confirm whether the 2nd root UID `g4stabGPKiWAE23NTw6oUsqawWf1` should also be
root here — the client only lists PHIL_UID; align client + rules.)

Proposed structure (admin = root or people-role admin; mod = people-role
moderator; member = any of admin/mod/user):

- `veritas/people`  → read: admin (+ each user may read their OWN record for
  role resolution); write: admin only.
- `veritas/sessions` → read: member; write: member (users create sessions).
- `veritas/categories` → read: member; write: admin or moderator.
- `veritas/acknowledged` → read: member; write: admin or moderator.
- Do NOT grant read/write at the `veritas` top level (keeps `people` private and
  lets the Data-modal restore be admin-gated). Note: the Data-modal "restore
  whole node" writes `veritas` directly — if that must keep working, give the
  top-level `.write` to admin only (a top-level admin grant is fine; it doesn't
  loosen children for non-admins).

### Open decision for build time
Session **edit/delete of *others'* sessions** is currently client-enforced only
(there's no `createdBy` on sessions, so rules can't tell whose session it is).
Options: (a) accept client-enforcement for that action (members are trusted
staff — fine for internal tool), or (b) add `createdBy` to sessions and enforce
"only owner or moderator can edit/delete." Default: (a); confirm with Phil.

## Rollout (matched-pair, like AutoFlag)
1. Branch on the veritas repo.
2. Client is already role-aware — verify `resolveRole` **bounces null-role users**
   (signs out anyone not Phil and not in `veritas/people`). If it doesn't, add
   that bounce so non-roster users are rejected gracefully (rules will deny them
   regardless, but the UX should be clean). Bump the rev pill for deploy validation.
3. Seed the roster: ensure Phil (root) + any moderators/users are in
   `veritas/people` (admin adds via the People modal).
4. Publish the hardened `veritas` rules (keep all OTHER apps unchanged).
5. Verify (probe with a token, as we did for AutoFlag):
   - A logged-in account **NOT** in `veritas/people` → read of `veritas/sessions`
     = Permission denied (gate works).
   - A **user** → can read sessions + create one; cannot write `veritas/people`
     or `veritas/categories`.
   - A **moderator** → can edit categories / acknowledge; cannot open People/Data.
   - **admin** → everything.

## Kickoff prompt to paste into the new (veritas) session
> Harden Veritas access. The client already has the admin/moderator/user role
> model and a veritas/people roster — the gap is the Firebase rules, which are
> currently wide open (auth != null read+write), so any Google account has full
> access. Replace the veritas rules block with role-based, roster-gated rules per
> access-model/VERITAS-rollout-spec.md: people = admin-only; sessions = members
> read+write; categories/acknowledged = admin/moderator write, members read; no
> read/write at the veritas top level (admin-only top-level write if the
> Data-modal restore needs it). Verify the client bounces non-roster users. Use
> a branch + PR + staged rollout + probe verification like AutoFlag. Same
> Firebase project (philinity-893d2).
