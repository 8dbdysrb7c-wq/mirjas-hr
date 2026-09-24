import { mkdir, copyFile } from 'node:fs/promises';
// Package the same evaluator used by the editor; do not maintain two policies.
await mkdir(new URL('../access-server/shared/', import.meta.url), { recursive: true });
for (const name of ['permissions.js', 'accessPolicy.js']) {
  await copyFile(new URL(`../src/utils/${name}`, import.meta.url), new URL(`../access-server/shared/${name}`, import.meta.url));
}
