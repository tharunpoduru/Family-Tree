/**
 * Replace all family data with the contents of src/data/seed.ts.
 * Deletes every person and union first, then writes the seed.
 * Run: npx tsx scripts/reset-firestore.mts
 *
 * Leaves users/ and suggestions/ untouched.
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

async function clear(collection: string) {
  const snap = await db.collection(collection).get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
  return snap.size;
}

async function main() {
  if (!Object.keys(seedFamily.people).length) {
    console.error(
      'The seed is empty — write your family into src/data/seed.ts first ' +
        '(prompts/build-your-seed.md can do it for you).',
    );
    process.exit(1);
  }
  const removedPeople = await clear('people');
  const removedUnions = await clear('unions');
  console.log(`Removed ${removedPeople} people, ${removedUnions} unions.`);

  const batch = db.batch();
  batch.set(db.doc('meta/family'), {
    family: seedFamily.family,
    rootUnion: seedFamily.rootUnion,
    seededAt: new Date().toISOString(),
  });
  for (const [id, person] of Object.entries(seedFamily.people)) {
    batch.set(db.doc(`people/${id}`), person);
  }
  for (const [id, union] of Object.entries(seedFamily.unions)) {
    batch.set(db.doc(`unions/${id}`), union);
  }
  await batch.commit();
  console.log(
    `Wrote ${Object.keys(seedFamily.people).length} people, ` +
      `${Object.keys(seedFamily.unions).length} unions.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
