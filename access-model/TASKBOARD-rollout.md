# Taskboard role-based access — rollout & verification

Implements the locked design in `TASKBOARD-rollout-spec.md` using the **ADOPTED
email-key-in-rules** standard (`ADOPTED-STANDARD.md`). Same Firebase project as
AutoFlag (`philinity-893d2`). Coordinated per `RULES-COORDINATION.md` — the
rules are one shared document; this rollout changes **only** the `taskboard`
block in `PIECE3-rules-to-deploy.json`.

## Roles
- **admin** (Phil + Trinity — both ROOT UIDs, lockout-proof, hardcoded in client
  and rules): all tasks, Data Manager, roster management.
- **moderator**: all tasks, no Data Manager / roster.
- **user** (e.g. Austen): only their mapped person's tasks (client-side
  filtering); no Data Manager.

## Roster node
`taskboard/access/{emailKey}` = `{ email, role, person?, name, addedAt, addedBy }`.
**Not** `taskboard/people` — that holds assignee names and would collide.
`emailKey` = email lowercased, dots→`_` (client uses a global regex; rules use a
6× `.replace('.','_')` chain — matched for ≤6-dot emails per the standard's
caveat).

## Rules shape (taskboard block, PIECE3)
Email-key-in-rules, granted at the LEAF (matches the Veritas block):

| Node | read | write |
|---|---|---|
| `taskboard` (top) | admin (root or `role==admin`) | admin |
| `taskboard/access` | admin | admin |
| `taskboard/access/{emailKey}` | the matching user (own record, for role resolution) | — |
| `taskboard/tasks` (parent) | any roster member | **admin only** (destructive Import/Restore) |
| `taskboard/tasks/{taskId}` | (via parent) | any roster member (normal edit/complete) |
| `categories` · `completionLog` · `taskOrder` · `nextId` · `nextCatId` · `people` · `aiHistory` | any roster member | any roster member |

The top-level grant is **admin-only** (the allowed exception — it can't loosen
children for non-admins, who fall through to the leaf grants). The hard-restrict
on destructive Import is enforced at the `tasks` **parent** write: a member can
write an individual `tasks/{id}` (normal edit) but cannot replace the whole
`tasks` node — only an admin can (which is what Import/Restore does).

## Client (taskboard repo, branch `claude/optimistic-tesla-fvn0w`, footer Rev 6.6)
1. **Roster gate** — root UIDs always admin; everyone else resolved from
   `taskboard/access/{emailKey}` (own-record read). Null-role accounts are
   signed out: *"This Google account is not authorized."*
2. **Role-based rendering** — admin/moderator see all; a `user` sees only tasks
   whose assignee matches their mapped `person` (board, mobile counts, history,
   person stats).
3. **Data Manager admin-only** (footer `📦 Data` hidden + `openDataModal()`
   refuses non-admins).
4. **Admin “Manage Access” modal** (footer `🔑 Access`) — add/update/remove
   `taskboard/access/{emailKey}`. Only admins ever read the whole `access` node;
   non-admins read only their own record (avoids permission-denied on login).
5. **Tasks persist as a keyed map** `taskboard/tasks/{id}` — normal `save()`
   writes individual tasks via a multi-path `update()` (also preserves `access`
   and `aiHistory`, which the old full-node `set()` used to clobber); Import
   writes the whole `tasks` node (`set(taskboard/tasks, …)` — admin-only).
6. **Per-leaf data listeners** replace the old wholesale `taskboard` read, so the
   rules can keep `access` admin-only without a cascading parent read.

## ⚠️ Data shape change — back up first
The first save migrates `taskboard/tasks` from an **array** to a **keyed map**.
The pre-6.6 client can't read the new shape, so this is effectively one-way.
**Open Data Manager → “Full Backup (JSON)” before rollout.**

## Staged rollout (matched-pair; do NOT run in parallel with another app's rules)
1. **Merge the client PR** (`taskboard`). Under current root-only rules, admins
   keep working; non-root users can't get in yet. Confirm footer = **Rev 6.6**.
2. **Take a Full Backup** (Data Manager).
3. **Seed the roster** as admin via **🔑 Access**: Austen → `user`, person
   **Austen**; add anyone else. (Trinity is already admin via her root UID.)
   Until the new rules are live, only root admins can write `taskboard/access`
   — which is who seeds. Console seeding is fine too.
4. **Publish rules:** paste the full `PIECE3-rules-to-deploy.json` into the
   Firebase console (Realtime Database → Rules) and publish. Only the
   `taskboard` block differs from what's live — verified below.
5. **Probe-verify** (next section), then flip the `RULES-COORDINATION.md`
   taskboard row to ✅ DEPLOYED.

## Deploy hand-off
The deployable is the **entire** `access-model/PIECE3-rules-to-deploy.json`
(all apps; only `taskboard` changed vs the currently-live rules). Paste the
whole file into the console. Pre-verified: every non-`taskboard` block is
byte-identical to `origin/main`'s PIECE3 (the last published state).

## Probe verification (tokens)
- [ ] Footer shows **Rev 6.6**.
- [ ] **Non-roster** Google account (not a root UID, not in `access`) → denied
      ("not authorized"), signed out.
- [ ] **Admin** (Phil): all tasks; `📦 Data` + `🔑 Access` visible; can
      add/remove roster entries; can read the whole `taskboard/access` node.
- [ ] **Moderator**: all tasks; no `📦 Data` / `🔑 Access`; reading the whole
      `taskboard/access` node is **denied**; reading own `access/{key}` works.
- [ ] **User** (Austen): board/mobile/history show **only** “Austen” tasks; no
      `📦 Data` / `🔑 Access`; can add/edit/complete his own tasks (writes to
      `tasks/{id}` succeed).
- [ ] **User/moderator** write at the `taskboard/tasks` **parent** (whole-node
      overwrite) is **denied**; an individual `tasks/{id}` write succeeds.
- [ ] After a normal task edit, `taskboard/access` and `taskboard/aiHistory` are
      still present (save no longer clobbers them).

## Notes
- The not-adopted `syncAccess`/UID-mirror design is **not** used (per
  `ADOPTED-STANDARD.md`).
- `taskboard/people` (assignee names) is untouched and member-writable.
