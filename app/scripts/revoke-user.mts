/**
 * Remove a member entirely — deletes their users/ doc and their auth
 * account (PRD R5: individual revocation, one leak never resets everyone).
 * Run: npx tsx scripts/revoke-user.mts someone@example.com
 * They can request access again later; nothing else about them is touched.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { projectId } from './lib/project.mts';

const email = process.argv[2];
if (!email) {
  console.error('Usage: npx tsx scripts/revoke-user.mts <email>');
  process.exit(1);
}

const app = initializeApp({
  credential: applicationDefault(),
  projectId: projectId(),
});

async function main() {
  const auth = getAuth(app);
  const db = getFirestore(app);

  const user = await auth.getUserByEmail(email);
  await db.doc(`users/${user.uid}`).delete();
  await auth.deleteUser(user.uid);
  console.log(`Removed ${email} (uid ${user.uid}): users doc and auth account deleted.`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
