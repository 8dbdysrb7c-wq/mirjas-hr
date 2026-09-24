import { createRequire } from 'node:module';
const require = createRequire(new URL('../access-server/package.json', import.meta.url));
const cliAuth = require('firebase-tools/lib/auth');
const { requireAuth } = require('firebase-tools/lib/requireAuth');
const { Client } = require('firebase-tools/lib/apiv2');
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { Firestore } = require('@google-cloud/firestore');
const { OAuth2Client } = require('google-auth-library');
const api = require('firebase-tools/lib/api');

export async function freeAuthAdmin() {
  const account = cliAuth.getGlobalDefaultAccount();
  if (!account) throw new Error('Firebase CLI login is required');
  const options = { project: 'mirjaswork', nonInteractive: true, ...account };
  await requireAuth(options);
  const credential = { async getAccessToken() {
    const token = await cliAuth.getAccessToken(account.tokens.refresh_token, options.authScopes);
    return { access_token: token.access_token, expires_in: 3600 };
  } };
  const app = initializeApp({ projectId: 'mirjaswork', credential });
  const authClient = new OAuth2Client(api.clientId(), api.clientSecret());
  authClient.refreshHandler = async () => {
    const token = await credential.getAccessToken();
    return { access_token: token.access_token, expiry_date: Date.now() + 50 * 60000 };
  };
  const db = new Firestore({ projectId: 'mirjaswork', authClient, preferRest: true });
  return { db, auth: getAuth(app), client: new Client({ urlPrefix: 'https://identitytoolkit.googleapis.com', auth: true }) };
}
