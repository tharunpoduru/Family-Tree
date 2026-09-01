/**
 * Upload the seed family graph to Firestore.
 * Run: npx tsx scripts/seed-firestore.mts
 * Auth: Application Default Credentials (gcloud auth application-default login).
 * Idempotent — merges doc-for-doc, preserving photo refs and other
 * fields added later through the app.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { seedFamily } from '../src/data/seed';
import { projectId } from './lib/project.mts';

const app = initializeApp({
  credential: applicationDefault(),
  projectId: projectId(),
});
const db = getFirestore(app);

async function main() {
  if (!Object.keys(seedFamily.people).length) {
    console.error(
      'The seed is empty — write your family into src/data/seed.ts first ' +
        '(prompts/build-your-seed.md can do it for you).',
    );
    process.exit(1);
  }
  const batch = db.batch();

  batch.set(db.doc('meta/family'), {
    family: seedFamily.family,
    rootUnion: seedFamily.rootUnion,
    seededAt: new Date().toISOString(),
  });

  for (const [id, person] of Object.entries(seedFamily.people)) {
    batch.set(db.doc(`people/${id}`), person, { merge: true });
  }
  for (const [id, union] of Object.entries(seedFamily.unions)) {
    batch.set(db.doc(`unions/${id}`), union, { merge: true });
  }

  await batch.commit();
  console.log(
    `Seeded ${Object.keys(seedFamily.people).length} people, ` +
      `${Object.keys(seedFamily.unions).length} unions, 1 meta doc.`,
  );
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
