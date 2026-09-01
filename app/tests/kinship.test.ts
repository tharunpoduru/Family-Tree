/**
 * Kinship terms — the classificatory rules the badge relies on.
 *
 * The regression that motivated this file: a viewer who married into the
 * family saw her husband's sister's granddaughter labelled "your your
 * spouse's great-granddaughter". Three bugs stacked up:
 *
 *   1. classify() let collateral steps (the sideways hop through a
 *      sibling) deepen the generation term, adding a "great-" that no
 *      Dravidian speaker would say — generation offset alone decides.
 *   2. kinshipOf() baked "your " into the English gloss, which the
 *      badge also prepends. Glosses must be bare noun phrases.
 *   3. The gloss said "spouse's granddaughter", as if the husband kept
 *      a separate family. A couple's nephews, nieces and grandchildren
 *      are shared; where the spouse genuinely must be named (their
 *      parents, a step-child), say "husband's"/"wife's".
 *
 * Tests pin the pack explicitly (kinshipOfWith) so they hold whichever
 * language a family configures in family.config.ts.
 */
import { describe, expect, it } from 'vitest';
import { kinshipOfWith } from '../src/lib/kinship';
import { english } from '../src/lib/lang/english';
import { kannada } from '../src/lib/lang/kannada';
import { telugu } from '../src/lib/lang/telugu';
import type { FamilyData, PersonId } from '../src/types/family';

/**
 * A minimal fixture (children eldest-first):
 *
 *   tata ⚭ avva
 *   ├── anna
 *   │   └── anna-son
 *   ├── husband ⚭ viewer (married in)
 *   │   └── son
 *   │       └── own-gd
 *   ├── husband ⚭ first-wife (earlier marriage)
 *   │   └── step-son
 *   ├── sister
 *   │   └── sis-son
 *   │       └── sis-gd
 *   └── chelli
 *       └── chelli-dau
 */
const data: FamilyData = {
  family: { en: 'Test' },
  rootUnion: 'u-root',
  people: {
    tata: { id: 'tata', name: { en: 'Tata' }, gender: 'm' },
    avva: { id: 'avva', name: { en: 'Avva' }, gender: 'f' },
    anna: { id: 'anna', name: { en: 'Anna' }, gender: 'm' },
    'anna-son': { id: 'anna-son', name: { en: 'Anna Son' }, gender: 'm' },
    chelli: { id: 'chelli', name: { en: 'Chelli' }, gender: 'f' },
    'chelli-dau': { id: 'chelli-dau', name: { en: 'Chelli Daughter' }, gender: 'f' },
    husband: { id: 'husband', name: { en: 'Husband' }, gender: 'm' },
    viewer: { id: 'viewer', name: { en: 'Viewer' }, gender: 'f' },
    'first-wife': { id: 'first-wife', name: { en: 'First Wife' }, gender: 'f' },
    'step-son': { id: 'step-son', name: { en: 'Step Son' }, gender: 'm' },
    sister: { id: 'sister', name: { en: 'Sister' }, gender: 'f' },
    son: { id: 'son', name: { en: 'Son' }, gender: 'm' },
    'own-gd': { id: 'own-gd', name: { en: 'Own Granddaughter' }, gender: 'f' },
    'sis-son': { id: 'sis-son', name: { en: 'Nephew' }, gender: 'm' },
    'sis-gd': { id: 'sis-gd', name: { en: 'Sis Granddaughter' }, gender: 'f' },
  },
  unions: {
    'u-root': {
      id: 'u-root',
      partners: ['tata', 'avva'],
      children: ['anna', 'husband', 'sister', 'chelli'],
    },
    'u-anna': { id: 'u-anna', partners: ['anna'], children: ['anna-son'] },
    'u-chelli': { id: 'u-chelli', partners: ['chelli'], children: ['chelli-dau'] },
    'u-viewer': { id: 'u-viewer', partners: ['husband', 'viewer'], children: ['son'] },
    'u-first': { id: 'u-first', partners: ['husband', 'first-wife'], children: ['step-son'] },
    'u-son': { id: 'u-son', partners: ['son'], children: ['own-gd'] },
    'u-sis': { id: 'u-sis', partners: ['sister'], children: ['sis-son'] },
    'u-sis-son': { id: 'u-sis-son', partners: ['sis-son'], children: ['sis-gd'] },
  },
};

const te = (viewer: PersonId, target: PersonId) => kinshipOfWith(telugu, data, viewer, target);
const kn = (viewer: PersonId, target: PersonId) => kinshipOfWith(kannada, data, viewer, target);
const en = (viewer: PersonId, target: PersonId) => kinshipOfWith(english, data, viewer, target);

describe('grandchild generation through collateral lines', () => {
  it('own granddaughter is a granddaughter', () => {
    expect(te('viewer', 'own-gd')).toMatchObject({
      native: 'మనవరాలు',
      en: 'granddaughter',
    });
  });

  it("sister's granddaughter is still a granddaughter, not a great-granddaughter", () => {
    expect(te('husband', 'sis-gd')).toMatchObject({
      native: 'మనవరాలు',
      en: 'granddaughter',
    });
  });

  it("husband's sister's granddaughter is shared — plain granddaughter", () => {
    expect(te('viewer', 'sis-gd')).toMatchObject({
      native: 'మనవరాలు',
      en: 'granddaughter',
    });
  });

  it("grandfather's brother is still a grandfather, not a great-grandfather", () => {
    expect(te('sis-gd', 'husband')).toMatchObject({
      native: 'తాతయ్య',
      en: "grandfather (father's side)",
    });
  });
});

describe('cross vs parallel nephews and nieces', () => {
  it("a man's sister's son is మేనల్లుడు (cross)", () => {
    expect(te('husband', 'sis-son')).toMatchObject({
      native: 'మేనల్లుడు',
      en: 'nephew',
    });
  });

  it("a woman's brother's son is మేనల్లుడు (cross)", () => {
    expect(te('sister', 'son')).toMatchObject({
      native: 'మేనల్లుడు',
      en: 'nephew',
    });
  });

  it("a man's brother's son is classificatorily his own (parallel)", () => {
    expect(te('husband', 'anna-son')).toMatchObject({
      native: 'అన్న కొడుకు',
      en: "brother's son",
    });
  });

  it("a woman's sister's daughter is classificatorily her own (parallel)", () => {
    expect(te('sister', 'chelli-dau')).toMatchObject({
      native: 'చెల్లెలి కూతురు',
      en: "sister's daughter",
    });
  });
});

describe('relatives through the spouse', () => {
  it("husband's sister's son is a shared nephew", () => {
    expect(te('viewer', 'sis-son')).toMatchObject({
      native: 'మేనల్లుడు',
      en: 'nephew',
    });
  });

  it('a parallel nephew through the spouse names whose brother it is', () => {
    expect(te('viewer', 'anna-son')).toMatchObject({
      native: 'అన్న కొడుకు',
      en: "husband's brother's son",
    });
  });

  it("a step-child names the spouse: husband's son, not spouse's", () => {
    expect(te('viewer', 'step-son')).toMatchObject({
      en: "husband's son",
    });
  });
});

describe('the kannada pack shares the engine', () => {
  it("a man's sister's son is ಸೋದರಳಿಯ (cross)", () => {
    expect(kn('husband', 'sis-son')).toMatchObject({
      native: 'ಸೋದರಳಿಯ',
      en: 'nephew',
    });
  });

  it('a parallel nephew composes with the Kannada genitive', () => {
    expect(kn('husband', 'anna-son')).toMatchObject({
      native: 'ಅಣ್ಣನ ಮಗ',
      en: "brother's son",
    });
  });

  it('grandmothers merge into ಅಜ್ಜಿ; the gloss keeps the side', () => {
    expect(kn('own-gd', 'viewer')).toMatchObject({
      native: 'ಅಜ್ಜಿ',
      en: "father's mother",
    });
  });

  it("the husband's elder brother is ಭಾವ", () => {
    expect(kn('viewer', 'anna')).toMatchObject({
      native: 'ಭಾವ',
      en: "husband's elder brother",
    });
  });
});

describe('the english pack has no native term', () => {
  it('the gloss stands alone', () => {
    const kin = en('husband', 'sis-son');
    expect(kin).toMatchObject({ en: 'nephew' });
    expect(kin?.native).toBeUndefined();
  });
});

describe('English glosses compose with the badge', () => {
  it('never starts with "your" or the impersonal "spouse\'s"', () => {
    const ids = Object.keys(data.people);
    for (const viewer of ids) {
      for (const target of ids) {
        const kin = te(viewer, target);
        if (kin) expect(kin.en, `${viewer} → ${target}`).not.toMatch(/^(your|spouse's) /);
      }
    }
  });
});
