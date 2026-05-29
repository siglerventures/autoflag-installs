# Piece 3 — Issues per-customer isolation

Issues move from flat `autoflag/issues/{issueId}` to nested
`autoflag/issues/{customerId}/{issueId}` so the database can isolate one
customer's issues from another's.

The migration runs **in-app** from **📦 Data Manager → 🧰 Issues Migration**
(admin only) — no console needed. It is **non-destructive**: Step 1 copies and
keeps the originals; Step 2 deletes them only after a verified nested copy
exists.

## Deploy order (matched set)

1. **Merge the Piece 3 client PR** → hard-refresh → confirm footer shows **v2.76**.
2. **Data Manager → 🧰 Issues Migration → 📦 Step 1: Migrate Issues.**
   Confirm the result toast, then hard-refresh and check issues display for
   admin, installer, and a customer.
3. **Publish Piece 3 rules** — paste `access-model/PIECE3-rules-to-deploy.json`
   into Firebase (back up current rules first).
4. **Verify isolation** (snippets below).
5. Once confident: **Data Manager → 🧹 Step 2: Clean Up Old Copies.**

Between steps 1–3 (a few minutes) customers may be briefly unable to **file new**
issues; admins/installers are unaffected and **no existing issue is lost**.
Rollback any time: re-publish the Piece 2 rules and/or revert the client merge —
the flat originals stay intact until Step 2.

## Verify isolation (run as a customer, after Piece 3 rules are live)

Whole-tree read should be **denied**:

```js
await(async()=>{const t=await new Promise(r=>{const o=indexedDB.open('firebaseLocalStorageDb');o.onsuccess=()=>{const s=o.result.transaction('firebaseLocalStorage','readonly').objectStore('firebaseLocalStorage').getAll();s.onsuccess=()=>r(s.result.find(e=>e.fbase_key?.startsWith('firebase:authUser:'))?.value?.stsTokenManager?.accessToken)}});return await(await fetch(`https://philinity-893d2-default-rtdb.firebaseio.com/autoflag/issues.json?auth=${t}`)).json()})()
```

Own-bucket read should **work** (replace `city_of_boise` if needed):

```js
await(async()=>{const t=await new Promise(r=>{const o=indexedDB.open('firebaseLocalStorageDb');o.onsuccess=()=>{const s=o.result.transaction('firebaseLocalStorage','readonly').objectStore('firebaseLocalStorage').getAll();s.onsuccess=()=>r(s.result.find(e=>e.fbase_key?.startsWith('firebase:authUser:'))?.value?.stsTokenManager?.accessToken)}});const d=await(await fetch(`https://philinity-893d2-default-rtdb.firebaseio.com/autoflag/issues/city_of_boise.json?auth=${t}`)).json();return d&&!d.error?'✅ OWN ISSUES READABLE':d})()
```

## What the buttons do

- **Step 1: Migrate Issues** — reads `autoflag/issues`, and for each flat issue
  (one with `customerId`) writes a copy to `autoflag/issues/{customerId}/{issueId}`.
  Originals are kept. Issues without a `customerId` are skipped (logged to console).
- **Step 2: Clean Up Old Copies** — deletes each flat original **only** after
  confirming its nested copy exists. Anything unverified is kept.
