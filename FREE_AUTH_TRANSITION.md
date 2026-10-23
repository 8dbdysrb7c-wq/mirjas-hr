# Free Firebase authentication transition

The selected implementation uses Spark-compatible Firebase email/password Auth,
Firestore rules and the existing Hosting project `mirjaswork`. Do not deploy
Cloud Functions, enable Blaze, link billing or use `firebase.access.json` for
this transition. The earlier Cloud Functions prototype is superseded.

## State on 2026-09-09

Local code added:
- Employee-number login aliases with the same trim/case normalization as legacy login.
- Firebase Auth login/session observation and removal of the old locally cached
  password-bearing session when the free-auth build is enabled.
- A separate Auth instance for admin account provisioning, preserving the admin
  session. Linking accounts still requires protected Firestore writes.
- Password-free employee directory projection and sanitizing profile writes.
- A trusted CLI audit and idempotent Auth import preparation script. Legacy
  passwords are PBKDF2-hashed in memory for import, never exported to a file.

Not active: `VITE_FREE_AUTH_ENABLED` is not set in the production build.
The existing website and live login are unchanged. No account was imported,
no remote rules were changed, and no billing option was enabled.

The Firebase management session expired with `invalid_rapt` and the official
CLI confirmed `firebase login --reauth` is required. A new login link was
generated for the user. Complete sign-in locally using
`scripts/complete_firebase_login.ps1`; never store the authorization code in
source control or a document.

## Remaining activation gates

1. Complete Google reauthentication and rerun `scripts/audit_free_auth.mjs`.
2. Inspect actual collection schemas, ownership fields, existing Auth accounts
   and normalized ID collisions. Do not assume that the source sample matches
   live employee records.
3. Implement and test closed Firestore rules for account mappings, profiles,
   grants, audit records and every business collection. The current
   `firestore.rules` remains permissive; it MUST NOT be mistaken for protection.
4. Implement corresponding scoped client queries, move sensitive stock fields
   into separate protected documents, and enforce their visibility in all
   reports/exports. Complete server-enforced policy persistence and read-only
   preview. The existing designer still stores illustrative local drafts.
5. Run `scripts/prepare_free_auth.mjs --prepare` only after the read-only audit.
   It enables email/password Auth and imports missing accounts without changing
   the live login or deleting legacy passwords. It does not link profiles yet.
6. Add and test the account-linking/migration checkpoint. Verify Auth logins,
   freeze source modifications briefly, link `authUid`, provision trusted
   `access_accounts` and `access_logins`, populate the safe directory, migrate
   current grants and securely remove all legacy plaintext password copies.
7. Validate existing workflows and denied direct API requests; prepare a
   coordinated Hosting/rules cutover with `VITE_FREE_AUTH_ENABLED=true`. Do not
   enable that flag or claim the free permission system is complete before
   these gates pass. No insecure login fallback is allowed after activation.

Current local tests: `node --test src/utils/freeAuthIdentity.test.js src/utils/accessPolicy.test.js`.
