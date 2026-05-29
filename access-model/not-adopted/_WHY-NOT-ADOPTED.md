# Why these files are not adopted

These are the early "gold-plated" access design — a `syncAccess` Cloud Function
that writes UID-mirror nodes (`{app}/admins_uid`, etc.) which rules then check:

- `README.md` — the design writeup
- `database.rules.json` — multi-app rules using UID-mirror checks
- `functions/` — the `syncAccess` callable

**None of it was ever deployed.** AutoFlag (and the standard for all apps) uses
**email-key-in-rules** instead — see `../ADOPTED-STANDARD.md`.

Kept for reference only. Do not build against these. Switching to the UID-mirror
model would have to be a deliberate all-apps migration, never a per-app choice.
