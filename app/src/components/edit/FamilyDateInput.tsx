/**
 * Composite date editor (PRD R1): Gregorian (partial allowed — year alone
 * is fine), tithi (māsa / paksha / tithi, any subset), approximate flag.
 * Everything optional; empty means "not recorded". Month and fortnight
 * spellings come from the active language pack.
 */
import type { FamilyDate, LunarMonth, Paksha, Tithi } from '../../types/family';
import { LUNAR_MONTHS, TITHIS } from '../../types/family';
import { pack } from '../../family.config';

const field =
  'min-h-12 rounded-xl border border-line bg-card px-3 text-[15px] text-ink outline-none focus:border-pasupu';

export function FamilyDateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: FamilyDate;
  onChange: (next: FamilyDate) => void;
}) {
  const [y = '', m = '', d = ''] = (value.gregorian ?? '').split('-');
  const cal = pack.calendar;

  function setGregorian(yy: string, mm: string, dd: string) {
    let g = yy;
    if (yy && mm) g += `-${mm}`;
    if (yy && mm && dd) g += `-${dd}`;
    onChange({ ...value, gregorian: g || undefined });
  }
  function setTithi(patch: Partial<NonNullable<FamilyDate['tithi']>>) {
    const t = { ...value.tithi, ...patch };
    const clean = Object.fromEntries(Object.entries(t).filter(([, v]) => v));
    onChange({ ...value, tithi: Object.keys(clean).length ? clean : undefined });
  }

  return (
    <fieldset className="m-0 rounded-2xl border border-line bg-paper p-4">
      <legend className="px-1.5 text-sm font-medium text-ink-soft">{label}</legend>
      <div className="grid grid-cols-3 gap-2">
        <input
          type="number"
          inputMode="numeric"
          placeholder="Year"
          aria-label={`${label} year`}
          value={y}
          onChange={(e) => setGregorian(e.target.value.slice(0, 4), m, d)}
          className={field}
        />
        <input
          type="number"
          inputMode="numeric"
          placeholder="Month"
          aria-label={`${label} month`}
          min={1}
          max={12}
          value={m}
          onChange={(e) => setGregorian(y, e.target.value.padStart(2, '0').slice(-2), d)}
          className={`${field} disabled:opacity-45`}
          disabled={!y}
        />
        <input
          type="number"
          inputMode="numeric"
          placeholder="Day"
          aria-label={`${label} day`}
          min={1}
          max={31}
          value={d}
          onChange={(e) => setGregorian(y, m, e.target.value.padStart(2, '0').slice(-2))}
          className={`${field} disabled:opacity-45`}
          disabled={!y || !m}
        />
      </div>
      <label className="mt-3 flex min-h-11 cursor-pointer items-center gap-2.5 text-[15px] text-ink-soft">
        <input
          type="checkbox"
          checked={!!value.approximate}
          onChange={(e) => onChange({ ...value, approximate: e.target.checked || undefined })}
          className="size-5 accent-[var(--color-nili)]"
        />
        Approximate — we&rsquo;re not certain
      </label>
      <p className="m-0 mt-4 mb-2 text-[13px] text-ink-faint">
        Tithi, if the family remembers it this way
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        <select
          aria-label={`${label} ${cal.labels.masa}`}
          value={value.tithi?.masa ?? ''}
          onChange={(e) => setTithi({ masa: (e.target.value || undefined) as LunarMonth })}
          className={field}
        >
          <option value="">{cal.labels.masa}…</option>
          {LUNAR_MONTHS.map((mm) => (
            <option key={mm} value={mm}>{cal.months[mm].en}</option>
          ))}
        </select>
        <select
          aria-label={`${label} ${cal.labels.paksha}`}
          value={value.tithi?.paksha ?? ''}
          onChange={(e) => setTithi({ paksha: (e.target.value || undefined) as Paksha })}
          className={field}
        >
          <option value="">{cal.labels.paksha}…</option>
          <option value="shukla">{cal.paksha.shukla}</option>
          <option value="krishna">{cal.paksha.krishna}</option>
        </select>
        <select
          aria-label={`${label} ${cal.labels.tithi}`}
          value={value.tithi?.tithi ?? ''}
          onChange={(e) => setTithi({ tithi: (e.target.value || undefined) as Tithi })}
          className={field}
        >
          <option value="">{cal.labels.tithi}…</option>
          {TITHIS.map((t) => (
            <option key={t} value={t}>{cal.tithis[t]}</option>
          ))}
        </select>
      </div>
    </fieldset>
  );
}
