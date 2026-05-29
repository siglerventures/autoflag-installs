/**
 * syncAccess — the ONLY thing that grants a user a role.
 *
 * Flow (runs on every login, client calls it right after Firebase Auth resolves):
 *   1. Client signs in (Google or email/password) → has an ID token.
 *   2. Client calls this callable with { app }.
 *   3. Function (Admin SDK, bypasses security rules) looks the caller up:
 *        - root admin UID?            -> role "admin"
 *        - {app}/people/{emailKey}?   -> role from roster
 *        - legacy {app}/installers/{uid}? -> role "installer"
 *   4. Function writes the matching UID-mirror node:
 *        admin     -> {app}/admins_uid/{uid}
 *        installer -> {app}/installers/{uid}
 *        customer  -> {app}/customers_uid/{uid}  (with customerId)
 *      and PRUNES stale mirrors if the roster changed (e.g. demoted/removed).
 *   5. Returns { role, customerId } to the client.
 *
 * Because users can never write these mirror nodes themselves (rules set
 * ".write": false), there is no self-grant bypass and no privilege escalation.
 *
 * Deploy: firebase deploy --only functions:syncAccess
 * Requires: firebase-functions v2, firebase-admin.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

if (!admin.apps.length) admin.initializeApp();

// Keep identical in client, rules, and here.
const ROOT_ADMIN_UIDS = [
  "CuJigrzCbRfFFsM7uqe0mix46xH3",
  "g4stabGPKiWAE23NTw6oUsqawWf1",
];

// Apps allowed to use this function. Add new app keys here.
const ALLOWED_APPS = [
  "autoflag",
  "eats",
  "taskboard",
  "command_center",
  "philinity",
  "foodswipe",
  "veritas",
];

const VALID_ROLES = ["admin", "installer", "customer"];

// MUST match the client's emailToKey exactly (global replace + special chars).
function emailToKey(email) {
  if (!email) return "";
  return email
    .toLowerCase()
    .trim()
    .replace(/\./g, "_")
    .replace(/#/g, "_HASH_")
    .replace(/\$/g, "_DOL_")
    .replace(/\[/g, "_OB_")
    .replace(/\]/g, "_CB_")
    .replace(/\//g, "_FS_");
}

exports.syncAccess = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Sign in first.");
  }

  const app = String(request.data?.app || "");
  if (!ALLOWED_APPS.includes(app)) {
    throw new HttpsError("invalid-argument", `Unknown app: ${app}`);
  }

  const uid = auth.uid;
  const email = (auth.token.email || "").toLowerCase().trim();
  const db = admin.database();

  // ---- Resolve role from trusted server-side data ----
  let role = null;
  let personRecord = null;

  if (ROOT_ADMIN_UIDS.includes(uid)) {
    role = "admin";
  } else if (email) {
    const key = emailToKey(email);
    const snap = await db.ref(`${app}/people/${key}`).get();
    const v = snap.val();
    if (v && typeof v === "object" && VALID_ROLES.includes(v.role)) {
      role = v.role;
      personRecord = v;
    }
    // Legacy installer path
    if (!role) {
      const legacy = await db.ref(`${app}/installers/${uid}`).get();
      const lv = legacy.val();
      if (lv === true || (lv && typeof lv === "object")) {
        role = "installer";
        personRecord = { ...(lv || {}), email, role: "installer", legacy: true };
      }
    }
  }

  // ---- Reconcile UID mirrors (grant current role, prune the others) ----
  const updates = {};
  updates[`${app}/admins_uid/${uid}`] = null;
  updates[`${app}/installers/${uid}`] = null;
  updates[`${app}/customers_uid/${uid}`] = null;

  let customerId = null;

  if (role === "admin") {
    updates[`${app}/admins_uid/${uid}`] = {
      email,
      name: personRecord?.name || auth.token.name || email,
      grantedAt: admin.database.ServerValue.TIMESTAMP,
    };
  } else if (role === "installer") {
    updates[`${app}/installers/${uid}`] = {
      email,
      name: personRecord?.name || auth.token.name || email,
      grantedAt: admin.database.ServerValue.TIMESTAMP,
    };
  } else if (role === "customer") {
    customerId = personRecord?.customerId || "";
    updates[`${app}/customers_uid/${uid}`] = {
      email,
      name: personRecord?.name || auth.token.name || email,
      customerId,
      grantedAt: admin.database.ServerValue.TIMESTAMP,
    };
  }
  // role === null -> all three stay null -> any prior access is revoked.

  await db.ref().update(updates);

  return { role, customerId };
});
