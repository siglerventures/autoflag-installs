# Taskboard rollout — spec & kickoff (for a session WITH taskboard repo access)

Captures the Taskboard analysis + locked design so the next session can build it
without re-deriving anything. Taskboard lives at `siglerventures/taskboard`
(GitHub Pages → https://siglerventures.github.io/taskboard/).

## What Taskboard is (from its source)
- Single `index.html`, Google sign-in. **Same Firebase project** as AutoFlag
  (`philinity-893d2`, same databaseURL).
- Currently gated by a hardcoded client array:
  `ALLOWED_UIDS = ['CuJigrzCbRfFFsM7uqe0mix46xH3', 'g4stabGPKiWAE23NTw6oUsqawWf1']`
  (checked in `googleSignIn` and in `onAuthStateChanged`). Rules are root-only.
- All data in ONE node `taskboard` = `{ tasks:[...], categories:[...],
  people:[...], aiHistory:..., + per-user mobile prefs }`, loaded wholesale via
  `onValue(ref(db,'taskboard'))`.
- A **task** has: `id, text, cat, assignee (a PERSON NAME string), priority,
  dateAdded, completedAt`, plus a completion log.
- Existing `taskboard/people` = **assignee names** (e.g. "Austen", "Trinity"),
  managed by an existing "+ Add Person" UI. These are NOT login accounts.
  ⚠️ Do NOT reuse this node for the auth roster — it would collide.
- Import/export buttons = the "Data Manager"; import writes the whole node.

## Locked design (decided with Phil)
Roles: **admin / moderator / user** (Taskboard); AutoFlag also has customer.
- **admin** (Phil): sees all tasks; has Data Manager; manages the access roster.
- **moderator** (Trinity): sees all tasks; NO Data Manager; no roster mgmt.
- **user** (e.g. Austen): sees ONLY tasks where `assignee == their mapped person`;
  no Data Manager; no roster mgmt.
- Root UIDs (the two above) are always admin (lockout-proof).
- **User task visibility = client-side filtering** (agreed — internal team tool,
  users are trusted staff). The gate, Data-Manager lock, and roster management
  are hard-enforced in rules.
- **In-app access modal** (admin only) to add/remove people by **email + role +
  mapped person** (the assignee name a `user` is tied to). Separate from the
  existing assignee "Add Person" UI.

## Auth roster (new node — avoid colliding with taskboard/people)
`taskboard/access/{emailKey}` = `{ email, role, person?, name, addedAt, addedBy }`
- `emailKey` = same transform as AutoFlag (lowercase, dots→underscores, etc.).
- `person` is set only for `role:user` — the assignee name to filter their tasks by.

## Client changes (taskboard index.html)
1. Replace the `ALLOWED_UIDS`-only gate with a **roster gate**: after sign-in,
   allow if root UID OR `taskboard/access/{emailKey}` has a valid role; else
   sign out with "not authorized". Resolve and store the role + mapped person.
2. **Role-based task rendering**: admin/moderator render all tasks; user renders
   only tasks whose `assignee` == their mapped person. (Filter in the render
   path; keep the shared data load.)
3. **Gate Data Manager (import/export) to admin only** (hide for moderator/user).
4. **New admin "Manage Access" modal**: list/add/remove access entries
   (email + role + person), writing `taskboard/access/{emailKey}`.
5. Add a visible **version indicator** (like AutoFlag's footer) for deploy validation.

## Rules (taskboard block — replace the current root-only block)
- `taskboard/access`: read = admin (+ own-record read for role resolution);
  write = admin only.
- `taskboard` task data (tasks/categories/people/aiHistory): read = any roster
  member (or root); write = any roster member (admin/mod/user all edit tasks).
- ⚠️ Decision needed at build time: destructive **import** writes the whole
  `taskboard` node; it's client-gated to admin, but rules-level any member can
  write the node. If import must be hard-restricted to admin, the import target
  needs finer rules or a guard. Default: client-gate only (matches the
  client-side-filtering decision); confirm with Phil.
- Keep all OTHER apps (autoflag, eats, etc.) byte-for-byte unchanged.

## Rollout (same matched-pair pattern as AutoFlag)
1. Branch on taskboard repo.
2. Ship CLIENT first (roster gate + role filtering + admin Data Manager + access
   modal + version bump). Under current root-only rules it still works for admins.
   But note: new non-root users can't get in until the access node + rules exist.
3. Seed the access roster (admin adds Phil/Trinity/Austen via the new modal —
   admins can write access once rules allow; until then, seed via console).
4. Publish the taskboard rules.
5. Verify: non-roster Google account denied; admin/mod see all; user sees only
   their assigned tasks; moderator has no Data Manager.

## Kickoff prompt to paste into the new session
> Roll out role-based access to Taskboard (siglerventures/taskboard) per
> access-model/TASKBOARD-rollout-spec.md in the autoflag-installs repo. Roles
> admin/moderator/user, client-side user filtering, in-app admin access modal,
> hard-enforced roster gate + admin-only roster/Data-Manager in rules. Use a
> branch + PR + staged rollout + verification like we did for AutoFlag.
