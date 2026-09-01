/**
 * Verifies the DEPLOYED security rules (PRD R5 acceptance criterion)
 * using real throwaway accounts against the real project.
 *
 * Stronger evidence than an emulator: it proves what is actually live.
 * Touches nothing the family owns — it creates two temporary auth users
 * and one temporary membership doc, then deletes all of them. It never
 * reads, writes, or deletes any person, union, or photo.
 */
import { initializeApp as initAdmin, applicationDefault, deleteApp as deleteAdminApp } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { getFirestore as getAdminDb } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithCustomToken, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { projectId, webEnv } from './lib/project.mts';

// Custom tokens are signed through IAM signBlob, so no key file is needed —
// but user credentials must name the service account to sign as. Find it in
// Firebase console → Project settings → Service accounts (the
// firebase-adminsdk-…@…iam.gserviceaccount.com address).
const serviceAccountId = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT;
if (!serviceAccountId) {
  console.error(
    'Set FIREBASE_ADMIN_SERVICE_ACCOUNT to your firebase-adminsdk service ' +
      'account email (Firebase console → Project settings → Service accounts).',
  );
  process.exit(1);
}

const admin = initAdmin({
  credential: applicationDefault(),
  projectId: projectId(),
  serviceAccountId,
});
const adminAuth = getAdminAuth(admin);
const adminDb = getAdminDb(admin);

const env = webEnv();
const client = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
});
const clientAuth = getAuth(client);
const clientDb = getFirestore(client);

const NO_MEMBERSHIP = 'rulescheck-nomembership';
const PENDING = 'rulescheck-pending';

let pass = 0;
let fail = 0;

async function denied(label: string, op: () => Promise<unknown>) {
  try {
    await op();
    console.log(`  ✗ FAIL  ${label} — was ALLOWED but must be denied`);
    fail += 1;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/permission|insufficient|PERMISSION_DENIED/i.test(msg)) {
      console.log(`  ✓ pass  ${label} — denied`);
      pass += 1;
    } else {
      console.log(`  ? ERROR ${label} — ${msg}`);
      fail += 1;
    }
  }
}

async function cleanup() {
  for (const uid of [NO_MEMBERSHIP, PENDING]) {
    await adminAuth.deleteUser(uid).catch(() => {});
  }
  await adminDb.collection('users').doc(PENDING).delete().catch(() => {});
}

async function signInAs(uid: string) {
  const token = await adminAuth.createCustomToken(uid);
  await signInWithCustomToken(clientAuth, token);
}

try {
  await cleanup();

  // ——— A signed-in account with NO membership at all ———
  await adminAuth.createUser({ uid: NO_MEMBERSHIP, email: 'rulescheck-none@example.com' });
  await signInAs(NO_MEMBERSHIP);
  console.log('\nSigned in, no membership record:');
  await denied('read a person', () => getDoc(doc(clientDb, 'people', 'p-anyone')));
  await denied('list all people', () => getDocs(collection(clientDb, 'people')));
  await denied('list all unions', () => getDocs(collection(clientDb, 'unions')));
  await denied('list the membership roll', () => getDocs(collection(clientDb, 'users')));
  await denied('write a person', () =>
    setDoc(doc(clientDb, 'people', 'p-intruder'), { id: 'p-intruder', name: { en: 'Intruder' } }),
  );
  await denied('grant itself approval', () =>
    setDoc(doc(clientDb, 'users', NO_MEMBERSHIP), {
      email: 'rulescheck-none@example.com',
      status: 'approved',
      role: 'admin',
    }),
  );
  await signOut(clientAuth);

  // ——— An account whose request is still pending ———
  await adminAuth.createUser({ uid: PENDING, email: 'rulescheck-pending@example.com' });
  await adminDb.collection('users').doc(PENDING).set({
    email: 'rulescheck-pending@example.com',
    status: 'pending',
    role: 'member',
  });
  await signInAs(PENDING);
  console.log('\nSigned in, request pending (the doorstep):');
  await denied('read a person', () => getDoc(doc(clientDb, 'people', 'p-anyone')));
  await denied('list all people', () => getDocs(collection(clientDb, 'people')));
  await denied('approve itself', () =>
    setDoc(
      doc(clientDb, 'users', PENDING),
      { status: 'approved' },
      { merge: true },
    ),
  );
  await denied('promote itself to admin', () =>
    setDoc(doc(clientDb, 'users', PENDING), { role: 'admin' }, { merge: true }),
  );
  await signOut(clientAuth);

  console.log(`\n${pass} passed, ${fail} failed`);
} finally {
  await cleanup();
  console.log('Temporary accounts removed.');
  await deleteAdminApp(admin);
}
process.exit(fail === 0 ? 0 : 1);
