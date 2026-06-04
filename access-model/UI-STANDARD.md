# UI standard — every app looks & works the same

Required on EVERY app (existing and new), mirroring AutoFlag. No app ships
without these.

## Footer — EXACT format
```
v{REV} · 📦 Data · 📜 History · 👥 People · {Name} ★ · 🚪 Sign Out
```
- `v{REV}` — injected at runtime from `<meta name="app-rev">` (NEVER hard-coded).
- **📦 Data** — admin only (hidden for non-admins).
- **📜 History** — activity log (visible per the app's roles).
- **👥 People** — admin only; the access/roster modal.
- `{Name} ★` — the signed-in user's name; the **★** shows ONLY for admins.
- **🚪 Sign Out** — always visible.

## Sign-in screen
- **Sign in with Google** button, AND
- **Email + password**: email field, password field, **Sign In** + **Create
  Account** buttons, and a **Forgot password?** link.
- (Admins add people by email + role in 👥 People; the person sets their OWN
  password via **Create Account** at first login — admins never set passwords.)

## Required surfaces (the footer links open these)
- **👥 People / Access modal** (admin): add / edit / remove people by **email +
  role**, writing the app's roster (`{app}/people/{emailKey}` or
  `{app}/access/{emailKey}`).
- **📦 Data modal** (admin): backup / export / restore.
- **📜 History**: activity log.

## Versioning
- Single source of truth: `<meta name="app-rev" content="X.Y">`.
- Footer version is injected from it at runtime — never hard-code the version in
  two places.
- **Bump it on every client change** (that's how we confirm the new file is live).

## Reference implementation
AutoFlag's `index.html` (`<footer>` block + the People/Data modals + the Rev 2.64
email/password login). Copy that structure; swap the app-specific bits.
