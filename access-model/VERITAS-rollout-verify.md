# Veritas rules hardening — staged rollout & probe verification

Matched-pair rollout for the role-based, roster-gated Veritas rules (the
`veritas` block in `database.rules.json`). Same Firebase project as AutoFlag
(`philinity-893d2`). Mirrors the AutoFlag rollout: seed → deploy → probe.

## What changed
- **Client** (`siglerventures/veritas`, `index.html`, Rev 6.15):
  - 2nd root UID `g4stabGPKiWAE23NTw6oUsqawWf1` added to `ROOT_ADMIN_UIDS` so
    client + rules agree on both lockout-proof admins.
  - `subscribePeople()` now only runs for admins (the roster is admin-only at
    the DB level; non-admins would otherwise hit permission-denied).
  - Rev pill bumped 6.14 → 6.15 for deploy validation.
  - The null-role bounce was already present (`resolveRole` → `signOut()` in
    both `googleSignIn` and `onAuthStateChanged`) — verified, unchanged.
- **Rules** (`database.rules.json`, `veritas` block): replaced the dead
  `admins_uid`-mirror baseline with per-subtree role gates that read the
  email-keyed roster directly:
  | path | read | write |
  |---|---|---|
  | `veritas` (top) | admin | admin (Data-modal export/restore) |
  | `veritas/people` | admin | admin |
  | `veritas/people/$ek` | own record (self) | — |
  | `veritas/sessions` | member | member |
  | `veritas/categories` | member | admin/moderator |
  | `veritas/acknowledged` | member | admin/moderator |

  `member` = admin/moderator/user in `veritas/people/{emailKey}.role` (or a
  root UID). The rules compute `emailKey` from `auth.token.email` with the same
  global replace chain (`. # $ [ ] /`) the client's `emailToKey` uses — parity
  checked against 7+ dot and special-char emails.

## 1. Seed the roster (before deploy)
In the live app as Phil (auto-admin), open **👥 People** and ensure:
- At least one **moderator** and one **user** are added (email + role).
- Have a 4th Google account that is **NOT** in the roster for the deny probe.

Phil is hardcoded admin; everyone else must have a `veritas/people/{ek}` record.

## 2. Deploy the rules
```bash
# from the access-model/ dir, against philinity-893d2
firebase deploy --only database
```
This publishes ALL apps' rules from `database.rules.json`; only the `veritas`
block changed. Confirm the Rev 6.15 client is live (footer pill) so a fresh
login re-resolves roles against the new rules.

## 3. Probe matrix (REST with ID tokens)
Grab each test account's ID token (DevTools while signed in:
`await firebase.auth().currentUser.getIdToken()`), then:

```bash
BASE=https://philinity-893d2-default-rtdb.firebaseio.com

# --- NON-ROSTER account: every Veritas read must be denied ---
curl -s "$BASE/veritas/sessions.json?auth=$TOKEN_NONROSTER"      # expect: Permission denied
curl -s "$BASE/veritas/categories.json?auth=$TOKEN_NONROSTER"    # expect: Permission denied

# --- USER: reads sessions + can create one; cannot touch people/categories ---
curl -s "$BASE/veritas/sessions.json?auth=$TOKEN_USER"                          # expect: data (or null)
curl -s -X POST -d '{"category":"probe","title":"t","updatedAt":0}' \
     "$BASE/veritas/sessions.json?auth=$TOKEN_USER"                             # expect: {"name":"-..."} (created)
curl -s -X PUT  -d '{"x":1}' "$BASE/veritas/categories.json?auth=$TOKEN_USER"   # expect: Permission denied
curl -s -X PUT  -d '{"role":"admin"}' \
     "$BASE/veritas/people/evil_test.json?auth=$TOKEN_USER"                     # expect: Permission denied
curl -s "$BASE/veritas/people.json?auth=$TOKEN_USER"                           # expect: Permission denied (whole roster)

# --- MODERATOR: can edit categories / acknowledge; cannot manage people ---
curl -s -X PUT -d '{"probe":{"id":"probe","name":"Probe"}}' \
     "$BASE/veritas/categories.json?auth=$TOKEN_MOD"                            # expect: written
curl -s -X PUT -d '{"role":"admin"}' \
     "$BASE/veritas/people/evil_test.json?auth=$TOKEN_MOD"                      # expect: Permission denied

# --- ADMIN: everything, incl. whole-node export/restore (Data modal) ---
curl -s "$BASE/veritas.json?auth=$TOKEN_ADMIN" | head -c 200                    # expect: data (export works)
curl -s "$BASE/veritas/people.json?auth=$TOKEN_ADMIN"                          # expect: roster

# --- Self-read of own record (role resolution) works for a non-admin ---
#   $ek = emailToKey of the USER account's email
curl -s "$BASE/veritas/people/$EK_USER.json?auth=$TOKEN_USER"                  # expect: own {role,...}
```

Clean up any probe writes (`evil_test`, `probe` category, probe session)
afterward. All "Permission denied" responses confirm the gate; any unexpected
`200`/data on a deny row is a regression — do not leave the rules deployed.

## Rollback
Re-deploy the previous `database.rules.json` (git revert this PR's rules change
and `firebase deploy --only database`). The Rev 6.15 client stays compatible
with the old admin-baseline rules for Phil/root, so a rules-only rollback is
safe.
