/**
 * Setup/teardown helper for verify-rules-live.sh.
 * Creates and removes ONLY the throwaway test membership and auth user.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { projectId } from './lib/project.mts';

const [, , action, uid] = process.argv;
if (!action || !uid) {
  console.error('usage: rules-fixture.mts <create|destroy> <uid>');
  process.exit(1);
}

const app = initializeApp({ credential: applicationDefault(), projectId: projectId() });
const db = getFirestore(app);

if (action === 'create') {
  await db.collection('users').doc(uid).set({
    email: 'rulescheck-throwaway@example.com',
    status: 'pending',
    role: 'member',
    note: 'temporary security-rules test fixture',
  });
  console.log('pending membership created');
} else {
  await db.collection('users').doc(uid).delete().catch(() => {});
  await getAuth(app).deleteUser(uid).catch(() => {});
  console.log('fixture removed');
}
process.exit(0);
