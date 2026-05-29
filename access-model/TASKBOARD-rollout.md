# Taskboard role-based access — rollout & verification

Implements the locked design in `TASKBOARD-rollout-spec.md` for
`siglerventures/taskboard` (GitHub Pages → https://siglerventures.github.io/taskboard/).
Same Firebase project as AutoFlag (`philinity-893d2`).

## What shipped

**Client** (`taskboard/index.html`, branch `claude/optimistic-tesla-fvn0w`,
footer bumped to **Rev 6.6**):

1. **Roster gate.** After Google sign-in, the two ROOT admin UIDs are always
   admin; everyone else's role is resolved from `taskboard/access/{emailKey}`.
   No valid role → signed out with "This Google account is not authorized."
2. **Role-based rendering.** `admin`/`moderator` see all tasks; a `user` sees
   only tasks whose assignee matches their mapped `person` (board, mobile
   counts, completion history, and person stats are all scoped). This is
   client-side filtering by design (trusted internal staff).
3. **Data Manager gated to admin** (footer `📦 Data` link hidden for others;
   `openDataModal()` also refuses non-admins).
4. **New admin “Manage Access” modal** (footer `🔑 Access`, admin only) to
   add/update/remove `taskboard/access/{emailKey}` entries by email + role +
   mapped person.
5. **Tasks are now a keyed map** `taskboard/tasks/{taskId}` instead of one
   array blob (see “Data shape change” below). Normal edits write individual
   tasks; a destructive Import/Restore writes the whole `tasks` node.
6. **Save no longer clobbers siblings.** `save()` uses a multi-path `update()`
   (was a full `set()` that overwrote the whole `taskboard` node), so
   `taskboard/access` and `taskboard/aiHistory` survive every save.

**Rules** (`access-model/database.rules.json`, `taskboard` block only — every
other app left byte-for-byte unchanged). Deploy with
`firebase deploy --only database`.

| Node | read | write |
|---|---|---|
| `taskboard/access` | admin (root or `role==admin`) | admin |
| `taskboard/access/{emailKey}` | the matching user (own record) | — |
| `taskboard/tasks` (parent) | any roster member | **admin only** (destructive Import) |
| `taskboard/tasks/{taskId}` | (inherits) | any roster member (normal edit/complete) |
| `categories`, `completionLog`, `taskOrder`, `nextId`, `nextCatId`, `people`, `aiHistory` | any roster member | any roster member |

There is intentionally **no `.read`/`.write` on `taskboard` itself** — a granted
parent read can never be revoked on a child, which would leak the access
roster. Everything is granted at the leaf.

### emailKey must match
Client `emailToKey()` and the rules both lowercase the email and turn dots into
`_`. RTDB `.replace()` only swaps the first match, so the rules chain
`.replace('.','_')` six times (same trick as the autoflag PIECE rules). The
other characters `emailToKey()` handles (`# $ [ ] /`) never appear in these
Google accounts, so both sides emit identical keys.

## Roles
- **admin** (Phil + Trinity — both ROOT UIDs, lockout-proof): all tasks, Data
  Manager, roster management.
- **moderator**: all tasks, no Data Manager, no roster.
- **user** (e.g. Austen): only their mapped person's tasks; no Data Manager.

> Per Phil's call, **both** root UIDs stay hard-coded admin (Trinity included),
> overriding the spec's "moderator" note for Trinity. `moderator` still exists
> for anyone added via the roster.

## Data shape change (read before deploying)
The first save migrates `taskboard/tasks` from an **array** to a **keyed map**
(`tasks/{id}`). This is what lets the rules allow per-task member edits while
keeping a whole-node overwrite admin-only. **The pre-6.6 client cannot read the
keyed-map shape**, so this is effectively one-way.

➡️ **Before rollout, open Data Manager → “Full Backup (JSON)” and save the
file.** If you ever need to roll back to the old client, restore that backup.

## Staged rollout (matched-pair, like AutoFlag)
1. **Merge the client PR** (`taskboard`). Under the *current* rules, admins
   (root UIDs) keep working; non-root users can't get in yet (the access node
   + new rules don't exist). Confirm the footer reads **Rev 6.6**.
2. **Take a Full Backup** from Data Manager (see above).
3. **Seed the roster.** As an admin, open **🔑 Access** and add:
   - Trinity → `admin` (or `moderator` if you change your mind later) — *or*
     skip her, since her root UID is already admin.
   - Austen → `user`, mapped person **Austen**.
   - Anyone else as needed.
   (Before the new rules are published, writes to `taskboard/access` only
   succeed for root admins — which is exactly who is seeding. If you prefer,
   seed `taskboard/access/{emailKey}` from the Firebase console instead.)
4. **Publish the rules:** merge the autoflag-installs PR, then
   `firebase deploy --only database`.
5. **Verify** (below).

## Verification checklist
- [ ] Footer shows **Rev 6.6**.
- [ ] A Google account **not** in the roster (and not a root UID) is denied with
      "This Google account is not authorized."
- [ ] **Admin** (Phil): sees all tasks; `📦 Data` and `🔑 Access` links visible;
      Data Manager opens; can add/remove roster entries.
- [ ] **Moderator** (if seeded): sees all tasks; **no** `📦 Data` / `🔑 Access`
      links; `openDataModal()` refuses.
- [ ] **User** (Austen): board, mobile counts, and history show **only** tasks
      assigned to “Austen”; no `📦 Data` / `🔑 Access`; can still add/edit/
      complete his own tasks (writes succeed).
- [ ] In the console, a `user` reading `taskboard/access` (the whole node) is
      **denied**; reading their own `taskboard/access/{theirKey}` succeeds.
- [ ] A `user`/`moderator` attempting a write at the **`taskboard/tasks` parent**
      (whole-node overwrite) is **denied**; an individual `tasks/{id}` write
      succeeds.
- [ ] `taskboard/access` and `taskboard/aiHistory` still present after a normal
      task edit (save no longer overwrites them).

## Notes
- The shared `syncAccess` Cloud Function still lists `taskboard` in
  `ALLOWED_APPS`, but the Taskboard client never calls it and the new rules
  don't read any UID-mirror node — so it's simply inert for Taskboard. Left
  untouched to avoid touching AutoFlag's function.
- `taskboard/people` is **assignee names** (the "+ Add Person" UI), not the auth
  roster. Untouched and member-writable.
