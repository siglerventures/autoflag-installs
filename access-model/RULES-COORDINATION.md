> **Standard:** the adopted access pattern is **email-key-in-rules** —
> see `ADOPTED-STANDARD.md` (reference impl: `PIECE2`/`PIECE3` rules). The
> `not-adopted/` folder (syncAccess + UID-mirror) was never deployed; ignore it.

# ⚠️ READ FIRST — Firebase rules are ONE shared document

All apps in the `philinity-893d2` project (autoflag, taskboard, veritas, eats,
command_center, philinity, foodswipe, users, config) share a **single** RTDB
rules document. Publishing rules for one app **republishes the whole thing**.

If two app-bots each build "the rules" from their own starting point, **whoever
publishes last wins and silently reverts the other's work.**

## Rules every app-bot MUST follow

1. **Start from the CURRENT live rules.** Before editing, copy the latest rules
   straight from the Firebase console (Realtime Database → Rules). Do NOT build
   from a spec file's snippet or an old copy — those go stale the moment another
   app is hardened.
2. **Change ONLY your own app's block.** Leave every other app's block
   byte-for-byte identical. You are editing one top-level key (e.g. `veritas`),
   nothing else.
3. **Sequence, don't parallelize.** Finish and publish one app's rollout before
   starting the next. Two rollouts editing the shared rules at the same time will
   clobber each other.
4. **Keep the lockout-proof root UIDs** consistent (`CuJigrzCbRfFFsM7uqe0mix46xH3`
   and, where applicable, `g4stabGPKiWAE23NTw6oUsqawWf1`).
5. **Back up before publishing** — copy the current rules to a file first, so
   rollback is instant.

## Current state (update this as apps are hardened)

| App | Rules state | Notes |
|---|---|---|
| autoflag | ✅ hardened (role-based, per-customer isolation) | Pieces 1–3 done |
| veritas | ✅ hardened + DEPLOYED 2026-05-31 | role-based (admin/moderator/user) in `PIECE3-rules-to-deploy.json`; client Rev 6.15. Probe-verified: roster member reads, non-roster denied |
| taskboard | 🔒 root-UID only | safe; hardened by the Taskboard rollout |
| eats | 🔒 root-UID only | safe; harden when it gets real users |
| command_center | 🔒 root-UID only | safe; harden when it gets real users |
| philinity | 🔒 root-UID only | safe; harden when it gets real users |
| foodswipe | 🔒 root-UID only | safe; harden when it gets real users |
| users / config | ✅ per-user private / locked | unchanged |
