# ADOPTED access-control standard

> This is the **real, in-production** standard for the `philinity-893d2` apps.
> Reference implementation: AutoFlag's live rules — `PIECE2-rules-to-deploy.json`
> and `PIECE3-rules-to-deploy.json` in this folder. Those are deployed and
> probe-verified. Copy that pattern for every app.

## The pattern (email-key-in-rules)

1. **Roster** at `{app}/people/{emailKey}` = `{ email, role, name, ... }`, where
   `role ∈ { admin, moderator, user, customer, installer }` (per app's needs).
   - `emailKey` = email lowercased with `.`→`_` (and the other RTDB-illegal chars).
     The **client** uses a global-regex `emailToKey()`; the **rules** reproduce it
     with a 6× `.replace('.','_')` chain. Keep the two matched.
2. **Root UIDs hardcoded** in both client and rules as lockout insurance
   (`CuJigrzCbRfFFsM7uqe0mix46xH3`, and `g4stabGPKiWAE23NTw6oUsqawWf1` where the
   app uses it). Align client and rules on which UIDs are root.
3. **Rules check role inline** by reading the roster:
   `root.child('{app}/people').child(<emailKey expr>).child('role').val() == 'admin'`
   (etc.). No Cloud Function, no UID-mirror node, no client round-trip.
4. **Grant at the LEAF, never the app's top level.** A grant at a parent cascades
   and can't be revoked by a child — that was the original AutoFlag hole. Push
   `.read`/`.write` down to each subtree (and per-tenant `$cid` where needed).
5. **Per-tenant isolation** (e.g. AutoFlag customers): scope a tenant's reads to
   their own node via `…/people/{ek}/customerId == $cid` at the `$cid` level.
6. **Client resolves its own role** by reading its own `{app}/people/{ek}` record
   (rules allow each user to read their OWN roster record) and **bounces
   null-role users** (signs out anyone not root and not in the roster).
7. **Own-record reads, admin-managed writes:** roster `.write` is admin-only;
   roster `.read` is admin (full) + each user's own record.

## Why the syncAccess / UID-mirror design was NOT adopted

The early "gold-plated" design (now in `not-adopted/`: its `README.md`,
`database.rules.json`, and `functions/syncAccess.js`) proposed a `syncAccess`
Cloud Function writing UID-mirror nodes (`{app}/admins_uid`, etc.) that rules
would check. **It was never deployed.** When we actually fixed AutoFlag we chose
email-key-in-rules because it needs no function, no client auth rewrite, and no
re-login. Adopting the mirror design for any single app now would make it the
*only* app on a different model than the live AutoFlag standard, add a function +
client + rules to maintain, and reintroduce the re-login/seed problems we avoided.

Those files are kept **for reference only**. Do not build against them. If the
org ever decides to standardize on UID-mirrors, it must be a deliberate, all-apps
migration — not a per-app divergence.

## Known caveat

The 6× `.replace('.','_')` chain handles emails with up to 6 dots and only escapes
dots (not `#$[]/`). That matches the real-world email set and the client's
`emailToKey`. If client and rules escaping ever diverge, role lookups silently
fail — so change them together.

## Adding a new app

1. Read `RULES-COORDINATION.md` first (the rules are one shared document).
2. Copy AutoFlag's `PIECE2`/`PIECE3` block, rename to your app key, adjust the
   data subtrees, and wire the client to read `{app}/people/{ek}` for its role.
3. Branch + PR + staged rollout + probe verification, like AutoFlag.
