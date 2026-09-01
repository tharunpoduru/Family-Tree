/**
 * Shared bootstrap for the admin scripts: the Firebase project id comes
 * from .firebaserc at the repo root (written by `firebase use`), so no
 * script ever hardcodes it.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

export function projectId(): string {
  try {
    const rc = JSON.parse(readFileSync(resolve(root, '.firebaserc'), 'utf8'));
    const id = rc?.projects?.default;
    if (typeof id === 'string' && id && id !== 'your-project-id') return id;
  } catch {
    // fall through to the error below
  }
  throw new Error(
    'No Firebase project configured. Run `firebase use <your-project-id>` ' +
      'in the repo root (see docs/SETUP.md).',
  );
}

/** KEY=value pairs from app/.env — the deployed web app's public config. */
export function webEnv(): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    for (const line of readFileSync(resolve(root, 'app/.env'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) out[m[1]] = m[2];
    }
  } catch {
    throw new Error('app/.env not found — copy app/.env.example and fill it in.');
  }
  return out;
}
