# Employee access transition — mirjaswork

## Deployment result (2026-09-09, Asia/Amman)

The authorized deployment to the current project was attempted. Firebase
rejected enabling `cloudbuild.googleapis.com` because `mirjaswork` requires
the Blaze plan. No function was deployed. The billing upgrade must be completed
in the Firebase console before retrying:
https://console.firebase.google.com/project/mirjaswork/usage/details

The 9 pure security/policy tests pass. Importing the server with
`ACCESS_PROJECT_ID=mirjaswork` succeeds and the unactivated handler returns 503.
Production authentication, employee permissions and Firestore rules remain
unchanged; the broader endpoint and migration work listed below is still needed.

## Current state

The existing login, permission checks and production Firestore rules are unchanged.
The employee list has an administrator-only **تخصيص واجهة وصلاحيات المستخدم** button.
It opens a local draft editor; drafts do not grant or revoke live access.

Implemented locally:
- Section presets, individual screen/action choices, inventory field visibility,
  both real factories, scope choices and per-section expiration timestamp.
- Import from the existing permission evaluator, copy and reset drafts.
- A separate illustrative preview of draft options (not impersonation of live pages).
- Local draft history with actor, timestamp and before/after differences.
- A Node server prototype with employee-number/password login, salted scrypt
  hashes, Firebase custom tokens, verified ID tokens, account disable checks,
  a transactional account login limit, administrator-only draft persistence,
  optimistic revisions and an atomic server audit record.
- A staging stock read endpoint enforcing policy, expiry, record scope and an
  explicit response field allowlist. Unsupported endpoints fail closed.

## Important limits before activation

This is NOT a completed replacement authorization system. The editor currently
persists to browser localStorage; its history is not a tamper-resistant audit log.
The Node server dependencies are installed. It has syntax and pure security
unit coverage. Firebase deployment is configured separately in
`firebase.access.json`, targeting the existing `mirjaswork` project.
`ACCESS_API_ENABLED=false` keeps the API closed until credential storage,
authentication and enforcement are verified. This flag does not activate live
permissions and must not be enabled solely because deployment succeeds.

Not implemented yet:
- Server-backed editor persistence and a production user/account migration.
- Interactive permission selection on actual page controls; real read-only user preview.
- Replacing the current direct Firestore reads and writes in every service.
- Backend business endpoints for writes, stock vouchers, transfers, approvals,
  export, reporting and the remaining modules.
- Confirming real owner/team/department fields for every collection and mapping
  legacy quantities, reservations, costs and prices to the staging response contract.
- Complete pagination and scoped Firestore queries (the staging stock endpoint
  currently reads at most 500 source records and reports truncation).
- Activation/revocation workflows and regression tests for all existing users.

Never enable draft restrictions in the current UI as if they protect the data.
Firestore's existing `allow read, write: if true` also exposes any newly added
collections in that same database. A more specific deny does not override it.
The user explicitly chose the current project. There is no separate-project
requirement. Protect all `access_*` collections against every permissive match
in the active rules before writing any credentials or policies. Existing public
password fields must be removed as part of the coordinated authentication
cutover; copying them into a secure collection alone does not secure accounts.

## Current-project deployment prerequisites

1. Enable Cloud Functions, Cloud Build and Artifact Registry for `mirjaswork`;
   Firebase may require a linked billing account. Deployment uses the existing
   Firebase CLI session; the deployed function uses its runtime service account.
2. Review the active Firestore rules and protect `access_*` paths before writing
   any secrets. Do not deploy `firestore.staging.rules` to the current database:
   its full deny rule would stop the legacy application.
3. Run `node scripts/build_access_server.mjs` from the repository root, then
   `firebase deploy --config firebase.access.json --only functions:employee-access --project mirjaswork`.
   The local server uses `ACCESS_PROJECT_ID=mirjaswork`; the Cloud Function reads
   the checked-in non-secret `.env.mirjaswork`. Never store service account keys
   in source control or in the browser.
4. Provision test-only identities after protection checks. Add edge/IP abuse
   controls before exposing `/login` publicly, and verify server token-signing
   IAM. Complete migration and API coverage before enabling restrictions.

Server data contracts (server-managed, never supplied by the client):
- `access_credentials/{credentialId(employeeNumber)}`: `uid`, `passwordHash`
  from `hashPassword`, `disabled: false`.
- `access_identities/{firebaseUid}`: `employeeId`, `name`, `disabled: false`,
  `canManageAccess`, optional verified `teamId`, `departmentId`.
- `access_policies/{employeeId}`: `{policy, revision, updatedAt, updatedBy}`.
- `access_audit`: immutable via API; audit records are created in the same
  transaction as the policy. Only the server service account can write them.

`POST /login` accepts `{employeeId, password}` and returns a Firebase custom
token. The staging client must exchange it with Firebase `signInWithCustomToken`
and send the resulting ID token as `Authorization: Bearer ...` to the API.
`GET /me`, `GET /policies/:employeeId`, `PUT /policies/:employeeId` and `GET /stock`
are the only initial authenticated routes. PUT requires `{policy, expectedRevision}`
and accepts drafts only. There is deliberately no HTTP activation endpoint yet.

Stock fixtures must use `ownerId`, `teamId`, `departmentId`, `warehouse` and
numeric quantity/price fields from `security.mjs`. Unknown/nested fields are
omitted from responses. Do not infer scope from employee names or accept scope
membership from request bodies.

## Transition gate

Complete business endpoint coverage and the authenticated client transport in
staging, verify bypass attempts and all policy combinations, compare migrated
access with each user's current access, then arrange a coordinated client/rules
cutover. There must be no interval in which the UI claims restricted access
while the legacy public Firestore endpoint remains readable.

Official references:
- https://firebase.google.com/docs/auth/admin/create-custom-tokens
- https://firebase.google.com/docs/firestore/security/rules-fields

Run pure tests from the repository root:
`node --test src/utils/accessPolicy.test.js access-server/security.test.mjs`
