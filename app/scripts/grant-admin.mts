/**
 * Grant admin to an email — bootstraps the first admins (PRD decision #2:
 * multiple admins from day one).
 * Run: npx tsx scripts/grant-admin.mts someone@example.com
 * Creates the auth user if they have never signed in; Google sign-in with
 * the same address later links to the same account.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { projectId } from './lib/project.mts';

const email = process.argv[2];
if (!email) {
  console.error('Usage: npx tsx scripts/grant-admin.mts <email>');
  process.exit(1);
}

const app = initializeApp({
  credential: applicationDefault(),
  projectId: projectId(),
});

async function main() {
  const auth = getAuth(app);
  const db = getFirestore(app);

  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    user = await auth.createUser({ email });
    console.log(`Created auth user for ${email}`);
  }

  await db.doc(`users/${user.uid}`).set(
    {
      email,
      displayName: user.displayName ?? '',
      role: 'admin',
      status: 'approved',
      grantedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  console.log(`${email} is now an approved admin (uid ${user.uid}).`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
