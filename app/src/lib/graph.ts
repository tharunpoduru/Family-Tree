/**
 * Pure graph helpers over FamilyData. The full graph lives in memory
 * (it is small — even 500 people is a few hundred KB), so every helper
 * is a simple synchronous lookup. No async, no loading states.
 */
import type {
  FamilyData,
  Person,
  PersonId,
  Union,
  UnionId,
} from '../types/family';

/** Unions in which this person is a partner (0..n — remarriage-safe). */
export function unionsAsPartner(data: FamilyData, id: PersonId): Union[] {
  return Object.values(data.unions).filter((u) =>
    (u.partners as PersonId[]).includes(id),
  );
}

/** The union in which this person appears as a child, if recorded. */
export function parentUnionOf(
  data: FamilyData,
  id: PersonId,
): Union | undefined {
  return Object.values(data.unions).find((u) => u.children.includes(id));
}

/**
 * A person's "home": the page where they are a subject.
 * Married → their (first) union page. Otherwise undefined — their details
 * live in a person sheet opened from their parents' page.
 */
export function homeUnionOf(
  data: FamilyData,
  id: PersonId,
): Union | undefined {
  return unionsAsPartner(data, id)[0];
}

export function spouseOf(union: Union, id: PersonId): PersonId | undefined {
  return (union.partners as PersonId[]).find((p) => p !== id);
}

export function personsOf(data: FamilyData, ids: PersonId[]): Person[] {
  return ids.map((id) => data.people[id]).filter(Boolean);
}

/** Where a tap on this person should land (R2/R4: no dead ends). */
export type Destination =
  | { kind: 'family'; unionId: UnionId }
  | { kind: 'person'; personId: PersonId };

export function destinationFor(data: FamilyData, id: PersonId): Destination {
  const home = homeUnionOf(data, id);
  return home
    ? { kind: 'family', unionId: home.id }
    : { kind: 'person', personId: id };
}

/**
 * Union of this union's "previous generation" for a given partner:
 * the union where that partner is a child.
 */
export function ascendFrom(
  data: FamilyData,
  partnerId: PersonId,
): Union | undefined {
  return parentUnionOf(data, partnerId);
}

/** Generation depth of a union measured from the root (root = 0). */
export function generationOf(data: FamilyData, unionId: UnionId): number {
  let depth = 0;
  let current: Union | undefined = data.unions[unionId];
  const guard = new Set<UnionId>();
  while (current && current.id !== data.rootUnion && !guard.has(current.id)) {
    guard.add(current.id);
    const viaParent: Union | undefined = (current.partners as PersonId[])
      .map((p) => parentUnionOf(data, p))
      .find(Boolean);
    if (!viaParent) break;
    depth += 1;
    current = viaParent;
  }
  return depth;
}

/** Every person, sorted for the directory (English name, locale-aware). */
export function allPeopleSorted(data: FamilyData): Person[] {
  return Object.values(data.people).sort((a, b) =>
    a.name.en.localeCompare(b.name.en),
  );
}

/**
 * Match against every name a person might be looked up by — formal,
 * native script, the name the family calls them, and the family they
 * were born into. Younger relatives often know only the nickname.
 */
export function matchesQuery(person: Person, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const raw = query.trim();
  const english = [
    person.name.en,
    person.nickname?.en,
    person.maidenName?.en,
  ].filter(Boolean) as string[];
  const native = [
    person.name.native,
    person.nickname?.native,
    person.maidenName?.native,
  ].filter(Boolean) as string[];
  return (
    english.some((n) => normalize(n).includes(q)) ||
    native.some((n) => n.includes(raw))
  );
}

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function isDeceased(person: Person): boolean {
  return person.death !== undefined;
}
