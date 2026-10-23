import { onRequest } from 'firebase-functions/v2/https';
import { accessHandler } from './server.mjs';

export const employeeAccess = onRequest({
  region: 'us-central1',
  memory: '256MiB',
  timeoutSeconds: 30,
  maxInstances: 2,
  concurrency: 2,
  invoker: 'public',
}, accessHandler);
