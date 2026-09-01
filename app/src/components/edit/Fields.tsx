/**
 * Form primitives — one place that owns field width, label spacing, and
 * vertical rhythm, so every edit sheet reads the same and nothing sticks
 * to anything else.
 */
import { useState, type ReactNode } from 'react';
import { pack } from '../../family.config';

const CONTROL =
  'w-full rounded-xl border border-line bg-paper px-4 py-3 text-base text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-pasupu';

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-ink-soft">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[13px] text-ink-faint">{hint}</span>}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  lang,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  lang?: string;
  placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <input
        lang={lang}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={CONTROL}
      />
    </Field>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <Field label={label}>
      <textarea
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${CONTROL} resize-none leading-relaxed`}
      />
    </Field>
  );
}

/** Two fields side by side on wide screens, stacked on phones. */
export function FieldPair({ children }: { children: ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2">{children}</div>;
}

/** A closed choice — the browser's own picker, which is best on phones. */
export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder = 'Not recorded',
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={CONTROL}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

/**
 * An open choice: a curated list for consistent spelling, free typing
 * for everything the list doesn't know. Picking an entry writes its
 * canonical `en` spelling.
 */
export function ComboboxField({
  label,
  value,
  onChange,
  options,
  hint,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ en: string; native?: string }>;
  hint?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const q = value.trim().toLowerCase();
  const shown = options.filter(
    (o) => !q || o.en.toLowerCase().includes(q) || o.native?.includes(value.trim()),
  );
  return (
    <div className="relative">
      <Field label={label} hint={hint}>
        <input
          role="combobox"
          aria-expanded={open && shown.length > 0}
          aria-autocomplete="list"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          className={CONTROL}
        />
      </Field>
      {open && shown.length > 0 && (
        <ul className="absolute inset-x-0 z-20 m-0 mt-1 max-h-56 list-none overflow-y-auto rounded-xl border border-line bg-card p-1 shadow-float">
          {shown.map((o) => (
            <li key={o.en}>
              <button
                type="button"
                // mousedown fires before the input's blur, so the pick lands.
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(o.en);
                  setOpen(false);
                }}
                className="flex w-full items-baseline justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] text-ink hover:bg-paper"
              >
                <span className="font-medium">{o.en}</span>
                {o.native && (
                  <span lang={pack.langTag} className="text-ink-soft">
                    {o.native}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-line bg-paper px-4 text-[15px] text-ink-soft">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-5 accent-[var(--color-nili)]"
      />
      {label}
    </label>
  );
}

export function PhotoField({
  label,
  file,
  onPick,
  hasExisting,
  onRemove,
  removed,
  children,
}: {
  label: string;
  file: File | null;
  onPick: (f: File | null) => void;
  hasExisting?: boolean;
  onRemove?: () => void;
  removed?: boolean;
  /** Crop editor, rendered under the picker when a photo is present. */
  children?: ReactNode;
}) {
  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-ink-soft">Photo</span>
      <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-line bg-paper px-4 text-[15px] text-ink-soft">
        <span className="whitespace-nowrap font-medium">📷 {label}</span>
        {file && (
          <span className="min-w-0 flex-1 truncate text-[13px] text-ink-faint">
            {file.name}
          </span>
        )}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
      </label>
      {removed ? (
        <p className="m-0 mt-2 text-[13px] text-nili">
          Photo will be removed when you save.
        </p>
      ) : (
        hasExisting &&
        !file &&
        onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="mt-2 text-[13px] font-medium text-ink-faint underline-offset-4 hover:underline"
          >
            Remove this photo
          </button>
        )
      )}
      {!removed && children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export interface FieldSuggestionItem {
  id: string;
  author: string;
  display: string;
  onUse: () => void;
  onDismiss: () => void;
  used: boolean;
}

/**
 * Suggested values shown ON the field they touch, so an admin always
 * knows exactly where a change lands.
 */
export function FieldSuggestions({ items }: { items: FieldSuggestionItem[] }) {
  if (!items?.length) return null;
  return (
    <ul className="m-0 mt-2 grid list-none gap-2 p-0">
      {items.map((s) => (
        <li
          key={s.id}
          className={`rounded-xl border px-3 py-2.5 ${
            s.used
              ? 'border-leaf/50 bg-leaf/10'
              : 'border-pasupu bg-pasupu-soft'
          }`}
        >
          <p className="m-0 text-[13px] text-nili-deep">
            <strong>{s.author}</strong> suggests
          </p>
          <p className="m-0 mt-0.5 break-words text-[15px] font-medium text-ink">
            {s.display}
          </p>
          <div className="mt-2 flex gap-2">
            {s.used ? (
              <span className="text-[13px] font-medium text-leaf">✓ Using this</span>
            ) : (
              <>
                <button
                  type="button"
                  onClick={s.onUse}
                  className="min-h-9 rounded-full bg-leaf px-3.5 text-[13px] font-medium text-[#fffdf8]"
                >
                  Use this
                </button>
                <button
                  type="button"
                  onClick={s.onDismiss}
                  className="min-h-9 rounded-full border border-line bg-card px-3.5 text-[13px] font-medium text-ink-soft"
                >
                  Dismiss
                </button>
              </>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Sheet section heading with proper space above. */
export function SheetTitle({ children }: { children: ReactNode }) {
  return (
    <h2
      className="m-0 mb-1 text-xl font-semibold leading-snug"
      style={{ fontFamily: 'var(--font-display)' }}
    >
      {children}
    </h2>
  );
}

export function SheetActions({
  busy,
  disabled,
  primaryLabel,
  busyLabel,
  onPrimary,
  onCancel,
  destructive,
}: {
  busy: boolean;
  disabled?: boolean;
  primaryLabel: string;
  busyLabel: string;
  onPrimary: () => void;
  onCancel: () => void;
  destructive?: ReactNode;
}) {
  return (
    <div className="space-y-3 border-t border-line pt-5">
      <div className="flex gap-3">
        <button
          type="button"
          disabled={busy || disabled}
          onClick={onPrimary}
          className="min-h-12 flex-1 rounded-full bg-nili px-6 font-medium text-[#fffdf8] transition-transform active:scale-[0.98] disabled:opacity-50"
        >
          {busy ? busyLabel : primaryLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="min-h-12 rounded-full border border-line bg-card px-6 font-medium text-ink-soft"
        >
          Cancel
        </button>
      </div>
      {destructive}
    </div>
  );
}
