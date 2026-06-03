# Drop-in CLAUDE.md for each app repo

Copy the block below into a file named **`CLAUDE.md` at the root of each app
repo** (taskboard, veritas, eats, orbit, …). Replace `<APP>` / `<app>` with the
app name. This makes any session on that repo auto-load the guardrails — and
reminds the bot to also mount `autoflag-installs` (where the shared rules +
standards live).

> Why: `CLAUDE.md` is per-repo. A session only auto-loads the CLAUDE.md of the
> repo it's working in. This stub gives each app its own, pointing back to the
> shared governance in `autoflag-installs`.

---

```markdown
# <APP> — conventions for Claude Code (read before editing)

This app shares the Philinity (`philinity-893d2`) access model and governance,
which live in the **`siglerventures/autoflag-installs`** repo.

## Mount the governance repo
Any access/roster/rules work REQUIRES `autoflag-installs` mounted in this session
(the shared rules file `access-model/PIECE3-rules-to-deploy.json` and the
standards live there). If it isn't mounted, ask the user to add it.

## Follow the shared standards
- Access model: `autoflag-installs/access-model/ADOPTED-STANDARD.md`
- New-app rollout: `autoflag-installs/access-model/NEW-APP-PLAYBOOK.md`
- Sign-in (Google + email/password): `autoflag-installs/access-model/SIGNIN-STANDARD.md`
- Shared-rules coordination: `autoflag-installs/access-model/RULES-COORDINATION.md`

## Must-knows (even without the repo mounted)
- Roles `admin / moderator / user` (+ customer/installer only if needed); roster
  at `<app>/people/{emailKey}`; root UIDs `CuJigrzCbRfFFsM7uqe0mix46xH3` +
  `g4stabGPKiWAE23NTw6oUsqawWf1` always admin.
- Offer BOTH Google AND email+password sign-in.
- Version: single `<meta name="app-rev">` + runtime injection; bump on every
  client change.
- Rules are ONE shared document — change only the `<app>` block; deploy is the
  user's Firebase console paste (client → verify → rules; never rules-first).
- PR per unit of work; never push onto an already-merged PR — open a new one.
```
