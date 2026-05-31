# Veritas rules hardening — staged rollout & probe verification

Matched-pair rollout for the role-based, roster-gated Veritas rules. Follows the
**adopted** standard (`ADOPTED-STANDARD.md`, email-key-in-rules) and the shared-
rules protocol in `RULES-COORDINATION.md`. Same Firebase project as AutoFlag
(`philinity-893d2`).

The hardened `veritas` block lives in **`PIECE3-rules-to-deploy.json`** (the
current full ruleset; only the `veritas` top-level key was changed — every other
app's block is byte-for-byte unchanged). The `not-adopted/` syncAccess /
UID-mirror design is NOT used.

## What changed
- **Client** (`siglerventures/veritas`, `index.html`, Rev 6.15):
  - 2nd root UID `g4stabGPKiWAE23NTw6oUsqawWf1` added to `ROOT_ADMIN_UIDS` so the
    client + rules agree on both lockout-proof admins.
  - `subscribePeople()` now only runs for admins (the roster is admin-only at the
    DB level; non-admins would otherwise hit permission-denied — `peopleRoster`
    is only consumed by the admin-only People modal).
  - Rev pill bumped 6.14 → 6.15 for deploy validation.
  - The null-role bounce was already present (`resolveRole` → `signOut()` in both
    `googleSignIn` and `onAuthStateChanged`) — verified, unchanged.
- **Rules** (`PIECE3-rules-to-deploy.json`, `veritas` block): replaced the
  wide-open `auth != null` read+write with per-subtree role gates that read the
  email-keyed roster directly (adopted idiom: `auth.token.email` lowercased +
  the 6× `.replace('.','_')` chain, `.child('role').val() == '<role>'`):

  | path | read | write |
  |---|---|---|
  | `veritas` (top) | admin | admin (Data-modal export reads `/veritas`; restore writes `/veritas`) |
  | `veritas/people` | admin | admin |
  | `veritas/people/$personKey` | own record (self) | — |
  | `veritas/sessions` | member | — (no blanket write; pushed to `$sid`) |
  | `veritas/sessions/$sid` | (member, via parent) | **author** (`createdBy.uid == auth.uid`) **or** admin/moderator |
  | `veritas/categories` | member | admin/moderator |
  | `veritas/acknowledged` | member | admin/moderator |

  **Per-session ownership (Rev 6.17 / client attribution):** members still read
  every session, but write is per-`$sid`: a `user` may create a session only with
  their own uid in `createdBy`, and may edit/delete only their own (and cannot
  reassign authorship); admins/moderators/root can edit/delete any. Legacy
  sessions created before attribution have no `createdBy` → only moderators/admins
  can move or delete them. Requires the Rev 6.17 client (stamps `createdBy.uid`)
  to be live first, so deploy these rules AFTER shipping that client.

  `member` = `admin`/`moderator`/`user` in `veritas/people/{emailKey}.role` (or a
  root UID). Email-key parity with the client's `emailToKey` was checked for all
  real-world (≤6 dot) emails. **Caveat (per ADOPTED-STANDARD):** the 6× chain only
  escapes dots and handles up to 6 of them; if the client/rules escaping ever
  diverge, role lookups silently fail — change them together.

## 1. Seed the roster (before deploy)
In the live app as Phil (auto-admin), open **👥 People** and ensure:
- At least one **moderator** and one **user** are added (email + role).
- Have a 4th Google account that is **NOT** in the roster for the deny probe.

Phil is hardcoded admin; everyone else must have a `veritas/people/{ek}` record.

## 2. Deploy the rules
Per `RULES-COORDINATION.md`: back up the CURRENT live rules from the Firebase
console first, confirm only the `veritas` block differs, then publish the full
`PIECE3-rules-to-deploy.json`. Publishing republishes ALL apps — only `veritas`
changed here. Confirm the Rev 6.15 client is live (footer pill) so a fresh login
re-resolves roles against the new rules.

## 3. Probe matrix (REST with ID tokens)
Grab each test account's ID token (DevTools while signed in:
`await firebase.auth().currentUser.getIdToken()`), then:

```bash
BASE=https://philinity-893d2-default-rtdb.firebaseio.com

# --- NON-ROSTER account: every Veritas read must be denied ---
curl -s "$BASE/veritas/sessions.json?auth=$TOKEN_NONROSTER"      # expect: Permission denied
curl -s "$BASE/veritas/categories.json?auth=$TOKEN_NONROSTER"    # expect: Permission denied

# --- USER: reads ALL sessions; can create/edit/delete only their OWN post ---
#   $UID_USER = this account's Firebase uid (DevTools: firebase.auth().currentUser.uid)
#   $OTHER_SID = id of a session created by a DIFFERENT user
curl -s "$BASE/veritas/sessions.json?auth=$TOKEN_USER"                          # expect: data (or null)
curl -s -X PUT -d '{"category":"probe","firstQuestion":"t","createdBy":{"uid":"'$UID_USER'"},"updatedAt":0}' \
     "$BASE/veritas/sessions/probe-own.json?auth=$TOKEN_USER"                   # expect: written (own post)
curl -s -X PUT -d '{"category":"probe","createdBy":{"uid":"someone-else"},"updatedAt":0}' \
     "$BASE/veritas/sessions/probe-forge.json?auth=$TOKEN_USER"                 # expect: Permission denied (can't post AS another)
curl -s -X DELETE "$BASE/veritas/sessions/probe-own.json?auth=$TOKEN_USER"      # expect: deleted (own post)
curl -s -X DELETE "$BASE/veritas/sessions/$OTHER_SID.json?auth=$TOKEN_USER"     # expect: Permission denied (not your post)
curl -s -X PUT  -d '{"x":1}' "$BASE/veritas/categories.json?auth=$TOKEN_USER"   # expect: Permission denied
curl -s -X PUT  -d '{"role":"admin"}' \
     "$BASE/veritas/people/evil_test.json?auth=$TOKEN_USER"                     # expect: Permission denied
curl -s "$BASE/veritas/people.json?auth=$TOKEN_USER"                           # expect: Permission denied (whole roster)

# --- MODERATOR: can edit categories / acknowledge / manage ANY session; not people ---
curl -s -X PUT -d '{"probe":{"id":"probe","name":"Probe"}}' \
     "$BASE/veritas/categories.json?auth=$TOKEN_MOD"                            # expect: written
curl -s -X PATCH -d '{"category":"probe"}' \
     "$BASE/veritas/sessions/$OTHER_SID.json?auth=$TOKEN_MOD"                   # expect: written (mod manages any post)
curl -s -X PUT -d '{"role":"admin"}' \
     "$BASE/veritas/people/evil_test.json?auth=$TOKEN_MOD"                      # expect: Permission denied

# --- ADMIN: everything, incl. whole-node export/restore (Data modal) ---
curl -s "$BASE/veritas.json?auth=$TOKEN_ADMIN" | head -c 200                    # expect: data (export works)
curl -s "$BASE/veritas/people.json?auth=$TOKEN_ADMIN"                          # expect: roster

# --- Self-read of own record (role resolution) works for a non-admin ---
#   $ek = emailToKey of the USER account's email (dots -> _)
curl -s "$BASE/veritas/people/$EK_USER.json?auth=$TOKEN_USER"                  # expect: own {role,...}
```

Clean up probe writes (`evil_test`, `probe` category, probe session) afterward.
Any unexpected `200`/data on a deny row is a regression — do not leave the rules
deployed.

## Rollback
Re-publish the backed-up previous rules (or `git revert` this PR's `PIECE3`
change and republish). The Rev 6.15 client stays compatible with the prior rules
for Phil/root, so a rules-only rollback is safe.
