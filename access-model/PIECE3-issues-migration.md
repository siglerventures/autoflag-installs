# Piece 3 — Issues per-customer isolation: migration scripts

Issues move from flat `autoflag/issues/{issueId}` to nested
`autoflag/issues/{customerId}/{issueId}`. Run these in the **browser console
while signed in as an admin** (your token has full write).

The migration is **non-destructive** (COPY): it writes nested copies and
**keeps the flat originals** until you've verified everything, so you can roll
back. A separate CLEANUP script deletes the originals once you're confident.

---

## 1) MIGRATION (copy flat → nested). Run after the Piece 3 client is live.

```js
await(async()=>{
  const t=await new Promise(r=>{const o=indexedDB.open('firebaseLocalStorageDb');o.onsuccess=()=>{const s=o.result.transaction('firebaseLocalStorage','readonly').objectStore('firebaseLocalStorage').getAll();s.onsuccess=()=>r(s.result.find(e=>e.fbase_key?.startsWith('firebase:authUser:'))?.value?.stsTokenManager?.accessToken)}});
  const base='https://philinity-893d2-default-rtdb.firebaseio.com/autoflag/issues';
  const all=await(await fetch(`${base}.json?auth=${t}`)).json()||{};
  let moved=0, skipped=0, already=0;
  for(const [k,v] of Object.entries(all)){
    const isFlat = v && typeof v==='object' && (('status' in v)||('title' in v)||('poleId' in v)||('filedAt' in v));
    if(!isFlat){ already++; continue; }                 // already a nested {cid} bucket
    const cid = v.customerId;
    if(!cid){ skipped++; console.warn('NO customerId, skipped issue:', k); continue; }
    const w = await fetch(`${base}/${cid}/${k}.json?auth=${t}`,{method:'PUT',body:JSON.stringify(v)});
    if(!w.ok){ console.error('write failed', k, w.status); continue; }
    moved++;
  }
  return `COPIED ${moved} issue(s) into nested buckets. Skipped(no cid): ${skipped}. Already-nested: ${already}. Flat originals KEPT for safety.`;
})()
```

After this, hard-refresh the app and confirm issues still show for admin,
installer, and a customer.

---

## 2) CLEANUP (delete legacy flat originals). Run ONLY after full verification.

```js
await(async()=>{
  const t=await new Promise(r=>{const o=indexedDB.open('firebaseLocalStorageDb');o.onsuccess=()=>{const s=o.result.transaction('firebaseLocalStorage','readonly').objectStore('firebaseLocalStorage').getAll();s.onsuccess=()=>r(s.result.find(e=>e.fbase_key?.startsWith('firebase:authUser:'))?.value?.stsTokenManager?.accessToken)}});
  const base='https://philinity-893d2-default-rtdb.firebaseio.com/autoflag/issues';
  const all=await(await fetch(`${base}.json?auth=${t}`)).json()||{};
  let del=0;
  for(const [k,v] of Object.entries(all)){
    const isFlat = v && typeof v==='object' && (('status' in v)||('title' in v)||('poleId' in v)||('filedAt' in v));
    if(isFlat){ const d=await fetch(`${base}/${k}.json?auth=${t}`,{method:'DELETE'}); if(d.ok) del++; }
  }
  return `Deleted ${del} legacy flat issue(s).`;
})()
```

---

## 3) VERIFY isolation after Piece 3 rules are published

As a **customer**, the whole-issues read should be DENIED, and the own-bucket
read should work:

```js
// should return {error:'Permission denied'}
await(async()=>{const t=await new Promise(r=>{const o=indexedDB.open('firebaseLocalStorageDb');o.onsuccess=()=>{const s=o.result.transaction('firebaseLocalStorage','readonly').objectStore('firebaseLocalStorage').getAll();s.onsuccess=()=>r(s.result.find(e=>e.fbase_key?.startsWith('firebase:authUser:'))?.value?.stsTokenManager?.accessToken)}});return await(await fetch(`https://philinity-893d2-default-rtdb.firebaseio.com/autoflag/issues.json?auth=${t}`)).json()})()
```

```js
// should return the customer's own issues (replace city_of_boise if needed)
await(async()=>{const t=await new Promise(r=>{const o=indexedDB.open('firebaseLocalStorageDb');o.onsuccess=()=>{const s=o.result.transaction('firebaseLocalStorage','readonly').objectStore('firebaseLocalStorage').getAll();s.onsuccess=()=>r(s.result.find(e=>e.fbase_key?.startsWith('firebase:authUser:'))?.value?.stsTokenManager?.accessToken)}});const d=await(await fetch(`https://philinity-893d2-default-rtdb.firebaseio.com/autoflag/issues/city_of_boise.json?auth=${t}`)).json();return d&&!d.error?'✅ OWN ISSUES READABLE':d})()
```

---

## Deploy order (matters)

1. **Merge the Piece 3 client PR** → confirm footer shows **v2.76**.
2. **Run MIGRATION (#1)** → hard-refresh → confirm issues show for all roles.
3. **Publish Piece 3 rules** (`access-model/PIECE3-rules-to-deploy.json`).
4. **Run VERIFY (#3)** → whole-tree denied, own-bucket readable.
5. Later, once confident: **run CLEANUP (#2)**.

Note: between steps 1 and 3 (a few minutes), **customers may be unable to file
new issues**; admins and installers are unaffected and no existing issue is ever
lost. Do steps 1–3 back to back. Rollback at any point: re-publish the previous
(Piece 2) rules and/or revert the client merge; the flat originals are intact
until you run CLEANUP.
