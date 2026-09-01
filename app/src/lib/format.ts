/**
 * Human formatting for FamilyDate and person lifespans.
 * Calendar display names (month spellings, fortnight labels) come from
 * the active language pack — Telugu families see Suddha/Bahula, others
 * see their own conventions.
 */
import type { FamilyDate, Person, TithiDate } from '../types/family';
import { pack } from '../family.config';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function formatTithi(t: TithiDate): string | undefined {
  const parts: string[] = [];
  if (t.masa) parts.push(pack.calendar.months[t.masa].en);
  if (t.paksha) parts.push(pack.calendar.paksha[t.paksha]);
  if (t.tithi) parts.push(pack.calendar.tithis[t.tithi]);
  return parts.length ? parts.join(' ') : undefined;
}

/** The lunar month in native script, when the pack has one. */
export function formatTithiNative(t: TithiDate): string | undefined {
  if (!t.masa) return undefined;
  return pack.calendar.months[t.masa].native;
}

/** '17 Aug 1946' | 'Aug 1946' | '1946', honoring partial ISO input. */
export function formatGregorian(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (d && m) return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
  if (m) return `${MONTHS[Number(m) - 1]} ${y}`;
  return y;
}

/**
 * Full display of a FamilyDate. Examples:
 *  '17 Aug 1946'
 *  'c. 1921'
 *  'Sravanam Suddha Padyami'
 *  '17 Aug 1946 · Sravanam Suddha Padyami'
 * Returns undefined when nothing at all is recorded.
 */
export function formatFamilyDate(date: FamilyDate | undefined): string | undefined {
  if (!date) return undefined;
  const parts: string[] = [];
  if (date.gregorian) parts.push(formatGregorian(date.gregorian));
  if (date.tithi) {
    const t = formatTithi(date.tithi);
    if (t) parts.push(t);
  }
  if (!parts.length) return undefined;
  const joined = parts.join(' · ');
  return date.approximate ? `c. ${joined}` : joined;
}

/** Year-only compact form for cards and the tree: '1918', 'c. 1921'. */
export function yearOf(date: FamilyDate | undefined): string | undefined {
  if (!date?.gregorian) return undefined;
  const y = date.gregorian.slice(0, 4);
  return date.approximate ? `c. ${y}` : y;
}

/** '1918 – 1996' | 'b. 1952' | 'd. Sravanam Suddha Padyami' | undefined. */
export function lifespanOf(person: Person): string | undefined {
  const b = yearOf(person.birth);
  const isDead = person.death !== undefined;
  const d = yearOf(person.death);
  if (b && isDead) return d ? `${b} – ${d}` : `${b} –`;
  if (b) return `b. ${b}`;
  if (isDead) {
    if (d) return `d. ${d}`;
    const t = person.death?.tithi ? formatTithi(person.death.tithi) : undefined;
    return t ? `d. ${t}` : undefined;
  }
  return undefined;
}

/** Initials for portrait-less avatars: 'First Ancestor' → 'FA'. */
export function initialsOf(nameEn: string): string {
  const words = nameEn.trim().split(/\s+/);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
