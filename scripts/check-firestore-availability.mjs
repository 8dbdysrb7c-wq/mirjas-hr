// One read of a nonexistent diagnostic document; never creates data.
const response = await fetch('https://firestore.googleapis.com/v1/projects/mirjaswork/databases/(default)/documents/hr_petitions/__codex_connectivity_probe__', { signal: AbortSignal.timeout(15000) });
const body = await response.json();
console.log(JSON.stringify({ httpStatus: response.status, status: body.error?.status, message: body.error?.message }));
