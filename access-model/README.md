# Standardized User-Access Model

One access model for every app (AutoFlag, eats, taskboard, command_center,
philinity, foodswipe, veritas). Copy this folder's patterns into each app and
they all behave identically.

## The model in one paragraph

**Authentication** (Firebase Auth) proves *who you are*. **Authorization** is a
separate roster + role system that decides *what you can do*. Anyone can create
a Firebase account, but they get zero access until an admin adds their **email**
to that app's `people` roster with a role (`admin` / `installer` / `customer`).
On login, a server function (`syncAccess`) reads that roster and writes a
**UID-mirror** node. Security rules only ever check those UID mirrors — which
**only the function can write** — so a user can never grant themselves a role.

```
 Google / email sign-in ─▶ Firebase Auth (identity)
        │
        ▼
 client calls syncAccess({ app })           ◀── runs on every login
        │
        ▼
 function reads {app}/people/{emailKey}      ◀── trusted roster (admin-managed)
        │      → resolves role + customerId
        ▼
 function writes {app}/admins_uid|installers|customers_uid/{uid}   (Admin SDK)
        │
        ▼
 security rules check those UID mirrors      ◀── the only thing rules trust
        │
        ▼
 reads/writes allowed/denied at the LEAF, scoped per role
```

## Why this replaces the old approach

| Old behavior | Risk | Fixed by |
|---|---|---|
| `.read`/`.write` granted at the whole `/autoflag` subtree | Customer scoping was cosmetic — any roster member could read **all** customers' data via REST | Grant only at the **leaf** (`installs/customers/$cid`, `issues/$issueId`) |
| `customers_uid/$uid` writable by `auth.uid == $uid` | **Any** Google account could self-grant and read everything | Mirror nodes are `".write": false`; only `syncAccess` (Admin SDK) writes them |
| Top-level write granted to installers; `people` child rule couldn't revoke it | An installer could set their own `role: "admin"` (privilege escalation) | No top-level write; `people` write is admin-only and actually enforced |
| `people` / `customers_uid` readable by any authenticated user | Roster + PII enumeration | Roster read is admin-only; users read only their own mirror |
| `veritas` open to all authenticated users | World read/write | Locked to the admin baseline |
| email→key `.replace('.','_')` chain inside rules | Breaks for 7+ dot emails; drifts from client escaping | No email munging in rules — rules check UID mirrors only |

Nothing here changes day-to-day behavior for honest users; it closes the holes
a malicious insider could use.

## Files

- `database.rules.json` — hardened rules for all apps. Deploy with
  `firebase deploy --only database`.
- `functions/syncAccess.js` — the role-provisioning callable.
- `functions/{index.js,package.json}` — deploy scaffolding
  (`firebase deploy --only functions:syncAccess`).

## Required client change (per app)

Replace the in-client role lookup + self-grant inside `onAuthStateChanged` with
a single call to `syncAccess`. In AutoFlag this swaps out the block at roughly
`index.html:2417-2474`:

```js
import { getFunctions, httpsCallable } from
  'https://www.gstatic.com/firebasejs/10.8.0/firebase-functions.js';
const functions = getFunctions(app);             // add near getAuth(app)
const syncAccess = httpsCallable(functions, 'syncAccess');

onAuthStateChanged(auth, async user => {
  if (!user) { /* ...unchanged sign-out handling... */ return; }
  if (state.user?.uid === user.uid && state.userRole) { state.user = user; return; }

  let role = null, customerId = null;
  try {
    const res = await syncAccess({ app: 'autoflag' });   // <-- the app key
    role = res.data.role;
    customerId = res.data.customerId;
  } catch (e) {
    console.error('syncAccess failed:', e);
  }

  if (!role) { toast('Access denied for ' + user.email, true); await signOut(auth); showLogin(); return; }

  state.user = user;
  state.userRole = role;
  state.isAdmin = (role === 'admin');
  state.userPersonRecord = customerId ? { customerId } : null;   // cid now comes from the function
  // ...rest of the existing UI/subscription branching unchanged...
});
```

The old `patchNode('autoflag/customers_uid/...')` self-grant (≈`index.html:2463`)
is deleted — the function does it now. The client no longer reads
`autoflag/people/...` directly (it's admin-only); `customerId` comes back from
`syncAccess`.

> Admin's People modal still writes `{app}/people/{key}` directly — that's
> allowed (admin write) and unchanged.

## Adding a new app

1. Copy the `autoflag` block in `database.rules.json`, rename to the app key,
   and adjust the data-node leaves (`installs`/`issues`) to that app's tree.
   Apps without customer-facing data can keep the admin-only baseline shown for
   `eats`/`taskboard`/etc.
2. Add the app key to `ALLOWED_APPS` in `functions/syncAccess.js`.
3. Pass that key as `syncAccess({ app: '<key>' })` in the client.
4. Keep the two `ROOT_ADMIN_UIDS` identical across client, rules, and function.

## Tradeoff to know

Installers are treated as **trusted staff**: server-side they can read all
operational data; the client still filters their view to assigned poles.
Customers are **hard-isolated** server-side to their own `customerId`. If you
ever need installers locked to assigned records at the database level too, that
requires restructuring pole data so each pole is reachable by an installer-UID
index — say the word and I'll spec it.
