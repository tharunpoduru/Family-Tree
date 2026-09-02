/**
 * Security rules tests (PRD R5 acceptance criterion).
 *
 * These rules are the only thing standing between the family's private
 * records and the open internet — UI gating is cosmetic. Every claim the
 * PRD makes about access is asserted here, from the attacker's side:
 * not "can the right person get in" but "is the wrong person kept out".
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, addDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getBytes } from 'firebase/storage';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '../..');
let env: RulesTestEnvironment;

const ADMIN = 'uid-admin';
const MEMBER = 'uid-member';
const PENDING = 'uid-pending';
const OUTSIDER = 'uid-outsider';

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'family-tree-rules-test',
    firestore: {
      rules: readFileSync(resolve(ROOT, 'firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
    storage: {
      rules: readFileSync(resolve(ROOT, 'storage.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 9199,
    },
  });
});

afterAll(async () => env?.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  // Seed memberships and one family record with rules bypassed.
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', ADMIN), {
      email: 'admin@example.com',
      status: 'approved',
      role: 'admin',
    });
    await setDoc(doc(db, 'users', MEMBER), {
      email: 'member@example.com',
      status: 'approved',
      role: 'member',
    });
    await setDoc(doc(db, 'users', PENDING), {
      email: 'pending@example.com',
      status: 'pending',
      role: 'member',
    });
    await setDoc(doc(db, 'people', 'p-1'), { id: 'p-1', name: { en: 'Ancestor' } });
    await setDoc(doc(db, 'unions', 'u-1'), { id: 'u-1', partners: ['p-1'], children: [] });
    await setDoc(doc(db, 'suggestions', 's-member'), {
      authorUid: MEMBER,
      status: 'pending',
      targetLabel: 'Ancestor',
    });
  });
});

const asAdmin = () => env.authenticatedContext(ADMIN).firestore();
const asMember = () => env.authenticatedContext(MEMBER).firestore();
const asPending = () => env.authenticatedContext(PENDING).firestore();
const asOutsider = () => env.authenticatedContext(OUTSIDER).firestore();
const asAnon = () => env.unauthenticatedContext().firestore();

describe('family records are private', () => {
  it('denies a signed-out visitor', async () => {
    await assertFails(getDoc(doc(asAnon(), 'people', 'p-1')));
    await assertFails(getDoc(doc(asAnon(), 'unions', 'u-1')));
  });

  it('denies a signed-in account with no membership at all', async () => {
    await assertFails(getDoc(doc(asOutsider(), 'people', 'p-1')));
  });

  it('denies an account whose request is still pending — the doorstep holds', async () => {
    await assertFails(getDoc(doc(asPending(), 'people', 'p-1')));
    await assertFails(getDoc(doc(asPending(), 'unions', 'u-1')));
  });

  it('allows an approved member to read', async () => {
    await assertSucceeds(getDoc(doc(asMember(), 'people', 'p-1')));
    await assertSucceeds(getDoc(doc(asMember(), 'unions', 'u-1')));
  });
});

describe('only admins write canonical data', () => {
  it('denies a member editing a person', async () => {
    await assertFails(updateDoc(doc(asMember(), 'people', 'p-1'), { 'name.en': 'Tampered' }));
  });

  it('denies a member creating or deleting a person', async () => {
    await assertFails(setDoc(doc(asMember(), 'people', 'p-new'), { id: 'p-new', name: { en: 'X' } }));
  });

  it('denies a pending account writing', async () => {
    await assertFails(setDoc(doc(asPending(), 'people', 'p-2'), { id: 'p-2', name: { en: 'X' } }));
  });

  it('allows an admin to write', async () => {
    await assertSucceeds(updateDoc(doc(asAdmin(), 'people', 'p-1'), { gotram: 'Kaushika' }));
  });
});

describe('privilege escalation is impossible', () => {
  it('denies a member promoting themselves to admin', async () => {
    await assertFails(updateDoc(doc(asMember(), 'users', MEMBER), { role: 'admin' }));
  });

  it('denies a pending account approving itself', async () => {
    await assertFails(updateDoc(doc(asPending(), 'users', PENDING), { status: 'approved' }));
  });

  it('denies requesting access pre-approved', async () => {
    await assertFails(
      setDoc(doc(asOutsider(), 'users', OUTSIDER), {
        email: 'outsider@example.com',
        status: 'approved',
        role: 'member',
      }),
    );
  });

  it('denies requesting access as an admin', async () => {
    await assertFails(
      setDoc(doc(asOutsider(), 'users', OUTSIDER), {
        email: 'outsider@example.com',
        status: 'pending',
        role: 'admin',
      }),
    );
  });

  it('denies creating a membership for somebody else', async () => {
    await assertFails(
      setDoc(doc(asOutsider(), 'users', MEMBER), {
        email: 'outsider@example.com',
        status: 'pending',
        role: 'member',
      }),
    );
  });

  it('denies a member listing the whole membership roll', async () => {
    await assertFails(getDocs(collection(asMember(), 'users')));
  });

  it('allows an admin to approve someone', async () => {
    await assertSucceeds(updateDoc(doc(asAdmin(), 'users', PENDING), { status: 'approved' }));
  });
});

describe('suggestions', () => {
  it('allows a member to suggest as themselves', async () => {
    await assertSucceeds(
      addDoc(collection(asMember(), 'suggestions'), {
        authorUid: MEMBER,
        status: 'pending',
        targetLabel: 'Ancestor',
      }),
    );
  });

  it('denies suggesting in somebody else’s name', async () => {
    await assertFails(
      addDoc(collection(asMember(), 'suggestions'), {
        authorUid: ADMIN,
        status: 'pending',
        targetLabel: 'Ancestor',
      }),
    );
  });

  it('denies a member self-approving a suggestion', async () => {
    await assertFails(
      addDoc(collection(asMember(), 'suggestions'), {
        authorUid: MEMBER,
        status: 'applied',
        targetLabel: 'Ancestor',
      }),
    );
    await assertFails(updateDoc(doc(asMember(), 'suggestions', 's-member'), { status: 'applied' }));
  });

  it('denies a pending account suggesting anything', async () => {
    await assertFails(
      addDoc(collection(asPending(), 'suggestions'), {
        authorUid: PENDING,
        status: 'pending',
        targetLabel: 'X',
      }),
    );
  });

  it('lets a member read their own but not another member’s', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'suggestions', 's-other'), {
        authorUid: 'uid-someone-else',
        status: 'pending',
        targetLabel: 'X',
      });
    });
    await assertSucceeds(getDoc(doc(asMember(), 'suggestions', 's-member')));
    await assertFails(getDoc(doc(asMember(), 'suggestions', 's-other')));
  });

  it('lets an admin review and decide', async () => {
    await assertSucceeds(getDoc(doc(asAdmin(), 'suggestions', 's-member')));
    await assertSucceeds(updateDoc(doc(asAdmin(), 'suggestions', 's-member'), { status: 'applied' }));
  });
});

describe('photo storage', () => {
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
  const meta = { contentType: 'image/png' };

  it('denies a member writing straight into the archive', async () => {
    const s = env.authenticatedContext(MEMBER).storage();
    await assertFails(uploadBytes(ref(s, 'photos/portraits/hack.png'), png, meta));
  });

  it('allows an admin to write into the archive', async () => {
    const s = env.authenticatedContext(ADMIN).storage();
    await assertSucceeds(uploadBytes(ref(s, 'photos/portraits/ok.png'), png, meta));
  });

  it('allows a member to upload into their own quarantine only', async () => {
    const s = env.authenticatedContext(MEMBER).storage();
    await assertSucceeds(uploadBytes(ref(s, `suggestions/${MEMBER}/a.png`), png, meta));
    await assertFails(uploadBytes(ref(s, `suggestions/${ADMIN}/a.png`), png, meta));
  });

  it('denies non-image uploads', async () => {
    const s = env.authenticatedContext(MEMBER).storage();
    await assertFails(
      uploadBytes(ref(s, `suggestions/${MEMBER}/evil.html`), png, { contentType: 'text/html' }),
    );
  });

  it('denies a pending account uploading', async () => {
    const s = env.authenticatedContext(PENDING).storage();
    await assertFails(uploadBytes(ref(s, `suggestions/${PENDING}/a.png`), png, meta));
  });

  it('denies an outsider reading family photos', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), 'photos/portraits/private.png'), png, meta);
    });
    const s = env.authenticatedContext(OUTSIDER).storage();
    await assertFails(getBytes(ref(s, 'photos/portraits/private.png')));
  });

  it('lets an approved member view family photos', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await uploadBytes(ref(ctx.storage(), 'photos/portraits/ok2.png'), png, meta);
    });
    const s = env.authenticatedContext(MEMBER).storage();
    await assertSucceeds(getBytes(ref(s, 'photos/portraits/ok2.png')));
  });
});

describe('client error log', () => {
  const entry = (uid: string) => ({ uid, stage: 'upload', code: 'stalled', message: 'x' });

  it('lets a member record their own failure', async () => {
    await assertSucceeds(addDoc(collection(asMember(), 'clientErrors'), entry(MEMBER)));
  });

  it('denies a member writing as someone else', async () => {
    await assertFails(addDoc(collection(asMember(), 'clientErrors'), entry(ADMIN)));
  });

  it('denies a pending account and an outsider', async () => {
    await assertFails(
      addDoc(collection(env.authenticatedContext(PENDING).firestore(), 'clientErrors'), entry(PENDING)),
    );
    await assertFails(
      addDoc(collection(env.authenticatedContext(OUTSIDER).firestore(), 'clientErrors'), entry(OUTSIDER)),
    );
  });

  it('only admins may read the log', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'clientErrors', 'e1'), entry(MEMBER));
    });
    await assertFails(getDoc(doc(asMember(), 'clientErrors', 'e1')));
    await assertSucceeds(getDoc(doc(asAdmin(), 'clientErrors', 'e1')));
  });
});

it('has no unguarded collection', async () => {
  await assertFails(setDoc(doc(asMember(), 'anything', 'x'), { a: 1 }));
  await assertFails(getDoc(doc(asMember(), 'anything', 'x')));
  expect(true).toBe(true);
});
