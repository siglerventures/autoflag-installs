# Sign-in standard — all apps offer Google AND email+password

Every app should offer **both** sign-in methods, mirroring AutoFlag:
- **Sign in with Google**, and
- **Email + password** (sign in, create account, reset password).

## Why / how it works
- **Access is keyed by email**, so the sign-in *method* doesn't matter — whether a
  person uses Google or email+password, the same email matches the same
  `{app}/people/{emailKey}` (or `{app}/access/{emailKey}`) record and grants the
  same role. **No roster or rules change is needed.**
- **Firebase is already configured** — the Email/Password provider is enabled on
  `philinity-893d2` (AutoFlag uses it), so there's no project-level setup.
- This is purely a **client change per app**: add the email/password UI + auth
  calls alongside the existing Google button.

## Reference implementation
AutoFlag's `index.html` already does this. Mirror its flow:
- Imports `createUserWithEmailAndPassword`, `signInWithEmailAndPassword`,
  `sendPasswordResetEmail` from the Firebase Auth SDK.
- Login screen has the Google button **plus** email + password fields, a
  Sign-In / Create-Account toggle, and a "forgot password" link.
- Friendly error mapping (`auth/invalid-credential`, `auth/email-already-in-use`,
  `auth/weak-password`, `auth/too-many-requests`, etc.).
- After auth, the SAME roster/role resolution runs regardless of method.

> Note: a person added to the roster by email still must sign in with **that exact
> email**. Email+password just means they can do so without a Google account —
> they create a password against that email instead.
