/**
 * Editing sheets: everyone edits in place. Admin saves apply instantly;
 * member saves become pending changes. Admins can also open a member's
 * suggested change pre-filled ("Edit first"), correct it, and apply.
 */
import { useEffect, useMemo, useState } from 'react';
import type {
  FamilyData,
  FamilyDate,
  Person,
  PhotoRef,
  Union,
} from '../../types/family';
import { newPersonId, newUnionId, normalizeDate } from '../../lib/edits';
import { useChangeSubmit, type SubmitOutcome } from '../../lib/changes';
import { setSuggestionStatus } from '../../lib/suggestions';
import {
  allPeopleSorted,
  matchesQuery,
  homeUnionOf,
  parentUnionOf,
  personsOf,
} from '../../lib/graph';
import { useReadyData } from '../../lib/data';
import { Avatar } from '../Avatar';
import { usePendingFor } from '../../lib/pending';
import {
  personFieldChanges,
  proposedValue,
  unionFieldChanges,
  withField,
  type FieldKey,
} from '../../lib/diff';
import { Sheet } from '../Sheet';
import { FamilyDateInput } from './FamilyDateInput';
import { PhotoSlot } from './PhotoSlot';
import {
  CheckboxField,
  ComboboxField,
  Field,
  FieldPair,
  FieldSuggestions,
  SelectField,
  SheetActions,
  SheetTitle,
  TextAreaField,
  TextField,
  type FieldSuggestionItem,
} from './Fields';
import { GOTRAS, GOTRA_LABEL, NAKSHATRAS, NAKSHATRA_LABEL } from '../../lib/tradition';
import { pack } from '../../family.config';
import { reportClientError } from '../../lib/diagnostics';
import { UploadError } from '../../lib/upload';

function useSubmitFlow(onClose: () => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggested, setSuggested] = useState(false);
  /** What the busy button says right now — e.g. upload progress. */
  const [progress, setProgress] = useState<string | null>(null);
  async function run(fn: () => Promise<SubmitOutcome>) {
    setBusy(true);
    setError(null);
    setProgress(null);
    try {
      const outcome = await fn();
      if (outcome === 'suggested') setSuggested(true);
      else onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save — try again.');
      // No server ever hears about a stalled phone; record it ourselves.
      reportClientError(e instanceof UploadError ? 'upload' : 'save', e);
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }
  function reset() {
    setSuggested(false);
    setError(null);
    setProgress(null);
  }
  return { busy, error, suggested, progress, setProgress, run, reset };
}

function percent(fraction: number): string {
  return `${Math.min(99, Math.floor(fraction * 100))}%`;
}

function SuggestedDone({ onClose }: { onClose: () => void }) {
  return (
    <div className="py-4 text-center">
      <p className="m-0 text-lg font-semibold">Sent to the family admins 🪔</p>
      <p className="m-0 mt-2 text-[15px] leading-relaxed text-ink-soft">
        Your edit is saved exactly as you wrote it. You can watch its progress
        on the home page.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-6 min-h-12 rounded-full bg-nili px-7 font-medium text-[#fffdf8]"
      >
        Done
      </button>
    </div>
  );
}

function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p role="alert" className="m-0 text-sm text-nili">
      {error}
    </p>
  );
}

function DeleteBlock({
  what,
  onDelete,
  busy,
}: {
  what: string;
  onDelete: () => void;
  busy: boolean;
}) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className="w-full text-center text-sm font-medium text-ink-faint underline-offset-4 hover:underline"
      >
        Delete {what}
      </button>
    );
  }
  return (
    <div className="rounded-2xl border border-nili/40 bg-nili/5 p-4 text-center">
      <p className="m-0 text-[15px] text-ink-soft">
        Delete {what} permanently? This cannot be undone.
      </p>
      <div className="mt-3 flex justify-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onDelete}
          className="min-h-11 rounded-full bg-nili px-5 text-sm font-medium text-[#fffdf8] disabled:opacity-50"
        >
          {busy ? 'Deleting…' : 'Yes, delete'}
        </button>
        <button
          type="button"
          onClick={() => setArmed(false)}
          className="min-h-11 rounded-full border border-line bg-card px-5 text-sm font-medium text-ink-soft"
        >
          Keep
        </button>
      </div>
    </div>
  );
}

// ————————————————— Person —————————————————

export function PersonEditSheet({
  person,
  onClose,
}: {
  person: Person | null;
  onClose: () => void;
}) {
  const { role, submit, uploadPhoto } = useChangeSubmit();
  const [draft, setDraft] = useState<Person | null>(null);
  const [nowFile, setNowFile] = useState<File | null>(null);
  const [thenFile, setThenFile] = useState<File | null>(null);
  const [deceased, setDeceased] = useState(false);
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
  const flow = useSubmitFlow(onClose);
  const pending = usePendingFor(person?.id);
  const data = useReadyData();
  // Parents come from the tree when this person is a child in a union;
  // the name fields exist only for people whose parents aren't recorded here.
  const linkedParents = useMemo(() => {
    if (!person) return [];
    const u = parentUnionOf(data, person.id);
    return u ? personsOf(data, u.partners as string[]) : [];
  }, [data, person]);

  // Curated gotras plus every spelling already in the family — a
  // married-in gotra typed once becomes a listed option for everyone.
  const gotraOptions = useMemo(() => {
    const known = new Set(GOTRAS.map((g) => g.en.toLowerCase()));
    const extras = [
      ...new Set(
        Object.values(data.people)
          .map((p) => p.gotra?.trim())
          .filter((g): g is string => !!g && !known.has(g.toLowerCase())),
      ),
    ]
      .sort()
      .map((en) => ({ en }));
    return [...GOTRAS, ...extras];
  }, [data]);

  useEffect(() => {
    setDraft(person ? structuredClone(person) : null);
    setNowFile(null);
    setThenFile(null);
    setDeceased(person?.death !== undefined);
    setUsedIds(new Set());
    flow.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person]);

  function patch(p: Partial<Person>) {
    setDraft((d) => (d ? { ...d, ...p } : d));
  }

  /** Suggested values, grouped by the field they touch. */
  const byField = useMemo(() => {
    const m = new Map<FieldKey, Array<{ id: string; author: string; display: string; value: unknown }>>();
    if (!person) return m;
    for (const row of pending) {
      if (row.change?.kind !== 'person.save') continue;
      for (const c of personFieldChanges(person, row.change.person)) {
        m.set(c.key, [
          ...(m.get(c.key) ?? []),
          {
            id: row.id,
            author: row.authorName,
            display: c.after,
            value: proposedValue(row.change.person, c.key),
          },
        ]);
      }
    }
    return m;
  }, [person, pending]);

  function applySuggestion(key: FieldKey, value: unknown, id: string) {
    setDraft((d) => (d ? withField(d, key, value) : d));
    if (key === 'death') setDeceased(value !== undefined);
    setUsedIds((s) => new Set(s).add(id));
  }

  /** Render the suggestion chips that belong to one field. */
  function hints(key: FieldKey): FieldSuggestionItem[] {
    return (byField.get(key) ?? []).map((s) => ({
      id: `${key}-${s.id}`,
      author: s.author,
      display: s.display,
      used: usedIds.has(s.id),
      onUse: () => applySuggestion(key, s.value, s.id),
      onDismiss: () => setSuggestionStatus(s.id, 'declined'),
    }));
  }

  async function save(): Promise<SubmitOutcome> {
    if (!draft) throw new Error('Nothing to save');
    const next: Person = {
      ...draft,
      birth: normalizeDate(draft.birth),
      death: deceased ? (normalizeDate(draft.death) ?? {}) : undefined,
    };
    const files = [nowFile, thenFile].filter((f): f is File => !!f).length;
    let uploaded = 0;
    const progress = (f: number) =>
      flow.setProgress(
        files > 1
          ? `Uploading photo ${uploaded + 1} of ${files} · ${percent(f)}`
          : `Uploading photo · ${percent(f)}`,
      );
    if (nowFile) {
      const path = await uploadPhoto('portraits', next.id, nowFile, progress);
      next.portrait = { ...next.portrait, path };
      uploaded++;
    }
    if (thenFile) {
      const path = await uploadPhoto('portraits', next.id, thenFile, progress);
      next.portraitThen = { ...next.portraitThen, path };
    }
    flow.setProgress('Saving…');
    const outcome = await submit(
      { kind: 'person.save', person: next, base: person ?? undefined },
      next.name.en,
    );
    // Suggestions folded into this save are now part of the record.
    if (outcome === 'applied' && usedIds.size) {
      await Promise.all([...usedIds].map((id) => setSuggestionStatus(id, 'applied')));
    }
    return outcome;
  }

  async function remove(): Promise<SubmitOutcome> {
    if (!draft) throw new Error('Nothing to delete');
    return submit(
      { kind: 'person.delete', personId: draft.id, name: draft.name.en },
      draft.name.en,
    );
  }

  return (
    <Sheet open={!!person && !!draft} label={`Edit ${person?.name.en ?? ''}`} onClose={onClose}>
      {flow.suggested ? (
        <SuggestedDone onClose={onClose} />
      ) : (
        draft && (
          <div className="space-y-5">
            <div>
              <SheetTitle>
                {role === 'admin'
                  ? `Edit ${draft.name.en}`
                  : `Suggest an edit — ${draft.name.en}`}
              </SheetTitle>
              {byField.size > 0 && (
                <p className="m-0 text-[15px] text-ink-soft">
                  Suggested changes appear on the fields they touch.
                </p>
              )}
            </div>

            <div>
              <TextField
                label="Name (English)"
                value={draft.name.en}
                onChange={(v) => patch({ name: { ...draft.name, en: v } })}
              />
              <FieldSuggestions items={hints('name.en')} />
            </div>
            {pack.langTag && (
              <div>
                <TextField
                  label={`Name (${pack.languageName})`}
                  lang={pack.langTag}
                  value={draft.name.native ?? ''}
                  onChange={(v) => patch({ name: { ...draft.name, native: v || undefined } })}
                />
                <FieldSuggestions items={hints('name.native')} />
              </div>
            )}
            <div>
              <TextField
                label="Called"
                value={draft.nickname?.en ?? ''}
                onChange={(v) =>
                  patch({ nickname: v ? { ...draft.nickname, en: v } : undefined })
                }
                hint="What the family actually calls them. Searchable."
              />
              <FieldSuggestions items={hints('nickname')} />
            </div>
            {pack.langTag && (
              <div>
                <TextField
                  label={`Called (${pack.languageName})`}
                  lang={pack.langTag}
                  value={draft.nickname?.native ?? ''}
                  onChange={(v) =>
                    patch({
                      nickname: draft.nickname?.en
                        ? { ...draft.nickname, en: draft.nickname.en, native: v || undefined }
                        : draft.nickname,
                    })
                  }
                />
              </div>
            )}
            <div>
              <span className="mb-2 block text-sm font-medium text-ink-soft">Gender</span>
              <div className="flex gap-2">
                {(['m', 'f'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => patch({ gender: draft.gender === g ? undefined : g })}
                    aria-pressed={draft.gender === g}
                    className={`min-h-12 flex-1 rounded-xl border font-medium ${
                      draft.gender === g
                        ? 'border-pasupu bg-pasupu-soft text-nili-deep'
                        : 'border-line bg-paper text-ink-soft'
                    }`}
                  >
                    {g === 'm' ? 'Man' : 'Woman'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <TextField
                label="Family born into"
                value={draft.maidenName?.en ?? ''}
                onChange={(v) => patch({ maidenName: v ? { ...draft.maidenName, en: v } : undefined })}
                hint={pack.ui.maidenHint}
              />
              <FieldSuggestions items={hints('maidenName')} />
            </div>
            <FieldPair>
              <div>
                <ComboboxField
                  label={GOTRA_LABEL}
                  value={draft.gotra ?? ''}
                  onChange={(v) => patch({ gotra: v || undefined })}
                  options={gotraOptions}
                  placeholder="Pick or type"
                />
                <FieldSuggestions items={hints('gotra')} />
              </div>
              <div>
                <SelectField
                  label={NAKSHATRA_LABEL}
                  value={draft.nakshatra ?? ''}
                  onChange={(v) => patch({ nakshatra: v || undefined })}
                  options={NAKSHATRAS.map((n) => ({
                    value: n.en,
                    label: n.native ? `${n.en} · ${n.native}` : n.en,
                  }))}
                />
                <FieldSuggestions items={hints('nakshatra')} />
              </div>
            </FieldPair>
            <div>
              <TextField
                label="Native place"
                value={draft.place ?? ''}
                onChange={(v) => patch({ place: v || undefined })}
              />
              <FieldSuggestions items={hints('place')} />
            </div>

            <fieldset className="m-0 rounded-2xl border border-line bg-paper p-4">
              <legend className="px-1.5 text-sm font-medium text-ink-soft">Parents</legend>
              {linkedParents.length > 0 ? (
                <>
                  <p className="m-0 mb-3 text-[13px] leading-relaxed text-ink-faint">
                    Their parents are in the tree, so they come from that link —
                    nothing to type here. Change it by editing the family page
                    they belong to.
                  </p>
                  <ul className="m-0 grid list-none gap-2 p-0">
                    {linkedParents.map((parent) => (
                      <li
                        key={parent.id}
                        className="flex items-center gap-3 rounded-xl border border-line bg-card px-3 py-2.5"
                      >
                        <Avatar person={parent} size="sm" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-medium">
                            {parent.name.en}
                          </span>
                          <span className="block text-[13px] text-ink-faint">
                            {parent.gender === 'f' ? 'Mother' : 'Father'} · from the tree
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <p className="m-0 mb-3 text-[13px] leading-relaxed text-ink-faint">
                    For the eldest generation, and for those who married in —
                    their parents by name.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <TextField
                        label="Father"
                        value={draft.fatherName?.en ?? ''}
                        onChange={(v) =>
                          patch({ fatherName: v ? { ...draft.fatherName, en: v } : undefined })
                        }
                      />
                      <FieldSuggestions items={hints('fatherName')} />
                    </div>
                    <div>
                      <TextField
                        label="Mother"
                        value={draft.motherName?.en ?? ''}
                        onChange={(v) =>
                          patch({ motherName: v ? { ...draft.motherName, en: v } : undefined })
                        }
                      />
                      <FieldSuggestions items={hints('motherName')} />
                    </div>
                  </div>
                </>
              )}
            </fieldset>

            <div>
              <Field label="Born">
                <FamilyDateInput
                  label="Born"
                  value={draft.birth ?? {}}
                  onChange={(birth: FamilyDate) => patch({ birth })}
                />
              </Field>
              <FieldSuggestions items={hints('birth')} />
            </div>
            <div>
              <TextField
                label="Birthplace"
                value={draft.birthPlace ?? ''}
                onChange={(v) => patch({ birthPlace: v || undefined })}
              />
              <FieldSuggestions items={hints('birthPlace')} />
            </div>

            <CheckboxField
              label="No longer with us"
              checked={deceased}
              onChange={setDeceased}
            />
            {deceased && (
              <>
                <div>
                  <Field label="Passed">
                    <FamilyDateInput
                      label="Passed"
                      value={draft.death ?? {}}
                      onChange={(death: FamilyDate) => patch({ death })}
                    />
                  </Field>
                  <FieldSuggestions items={hints('death')} />
                </div>
                <div>
                  <TextField
                    label="Passed in"
                    value={draft.deathPlace ?? ''}
                    onChange={(v) => patch({ deathPlace: v || undefined })}
                  />
                  <FieldSuggestions items={hints('deathPlace')} />
                </div>
              </>
            )}

            <div>
              <TextAreaField
                label="Their story"
                value={draft.bio ?? ''}
                onChange={(v) => patch({ bio: v || undefined })}
                placeholder="Anything the family should remember…"
              />
              <FieldSuggestions items={hints('bio')} />
            </div>
            <div className="space-y-3">
              <span className="block text-sm font-medium text-ink-soft">Photographs</span>
              <PhotoSlot
                label="Recent"
                hint="Shown by default."
                value={draft.portrait}
                file={nowFile}
                onPickFile={(f) => {
                  setNowFile(f);
                  if (f) patch({ portrait: { path: draft.portrait?.path ?? '' } });
                }}
                onChange={(portrait) => patch({ portrait })}
                onRemove={() => {
                  setNowFile(null);
                  patch({ portrait: undefined });
                }}
                aspect={1}
                round
              />
              <PhotoSlot
                label="When they were younger"
                hint="Optional — tapping the portrait turns between the two."
                value={draft.portraitThen}
                file={thenFile}
                onPickFile={(f) => {
                  setThenFile(f);
                  if (f) patch({ portraitThen: { path: draft.portraitThen?.path ?? '' } });
                }}
                onChange={(portraitThen) => patch({ portraitThen })}
                onRemove={() => {
                  setThenFile(null);
                  patch({ portraitThen: undefined });
                }}
                aspect={1}
                round
              />
              <FieldSuggestions items={hints('portrait')} />
            </div>
            <ErrorLine error={flow.error} />
            <SheetActions
              busy={flow.busy}
              disabled={!draft.name.en.trim()}
              primaryLabel={role === 'admin' ? 'Save' : 'Send for approval'}
              busyLabel={flow.progress ?? 'Saving…'}
              onPrimary={() => flow.run(save)}
              onCancel={onClose}
              destructive={
                <DeleteBlock
                  what={draft.name.en}
                  busy={flow.busy}
                  onDelete={() => flow.run(remove)}
                />
              }
            />
          </div>
        )
      )}
    </Sheet>
  );
}

// ————————————————— Union —————————————————

export function UnionEditSheet({
  data,
  union,
  onClose,
}: {
  data: FamilyData;
  union: Union | null;
  onClose: () => void;
}) {
  const { role, submit, uploadPhoto } = useChangeSubmit();
  const [marriage, setMarriage] = useState<FamilyDate>({});
  const [album, setAlbum] = useState<PhotoRef[]>([]);
  const [albumFiles, setAlbumFiles] = useState<(File | null)[]>([]);
  const [children, setChildren] = useState<string[]>([]);
  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
  const flow = useSubmitFlow(onClose);
  const pending = usePendingFor(union?.id);

  useEffect(() => {
    setMarriage(union?.marriage ? structuredClone(union.marriage) : {});
    setChildren(union ? [...union.children] : []);
    setAlbum(union?.photos ? structuredClone(union.photos) : []);
    setAlbumFiles(union?.photos ? union.photos.map(() => null) : []);
    setUsedIds(new Set());
    flow.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [union]);

  const nameOf = (id: string) => data.people[id]?.name.en ?? id;

  /** Marriage-date suggestions, shown on the date field itself. */
  const marriageHints: FieldSuggestionItem[] = useMemo(() => {
    if (!union) return [];
    const out: FieldSuggestionItem[] = [];
    for (const row of pending) {
      if (row.change?.kind !== 'union.save') continue;
      for (const c of unionFieldChanges(union, row.change.union, nameOf)) {
        if (c.key !== 'marriage') continue;
        const proposed = row.change.union.marriage;
        out.push({
          id: `marriage-${row.id}`,
          author: row.authorName,
          display: c.after,
          used: usedIds.has(row.id),
          onUse: () => {
            setMarriage(proposed ? structuredClone(proposed) : {});
            setUsedIds((s) => new Set(s).add(row.id));
          },
          onDismiss: () => setSuggestionStatus(row.id, 'declined'),
        });
      }
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [union, pending, usedIds]);

  function move(i: number, dir: -1 | 1) {
    setChildren((c) => {
      const next = [...c];
      const j = i + dir;
      if (j < 0 || j >= next.length) return c;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  const label = union
    ? (union.partners as string[]).map((p) => data.people[p]?.name.en).join(' & ')
    : '';

  async function save(): Promise<SubmitOutcome> {
    if (!union) throw new Error('Nothing to save');
    // Upload any newly chosen photos, keep the album's order.
    const photos: PhotoRef[] = [];
    const total = albumFiles.filter(Boolean).length;
    let uploaded = 0;
    for (let i = 0; i < album.length; i++) {
      const file = albumFiles[i];
      const path = file
        ? await uploadPhoto('weddings', union.id, file, (f) =>
            flow.setProgress(
              total > 1
                ? `Uploading photo ${uploaded + 1} of ${total} · ${percent(f)}`
                : `Uploading photo · ${percent(f)}`,
            ),
          )
        : album[i].path;
      if (file) uploaded++;
      if (path) photos.push({ ...album[i], path });
    }
    flow.setProgress('Saving…');
    const next: Union = {
      ...union,
      marriage: normalizeDate(marriage),
      children,
      photos: photos.length ? photos : undefined,
    };
    const outcome = await submit({ kind: 'union.save', union: next, base: union }, label);
    if (outcome === 'applied' && usedIds.size) {
      await Promise.all([...usedIds].map((id) => setSuggestionStatus(id, 'applied')));
    }
    return outcome;
  }

  async function remove(): Promise<SubmitOutcome> {
    if (!union) throw new Error('Nothing to delete');
    return submit({ kind: 'union.delete', unionId: union.id, label }, label);
  }

  return (
    <Sheet open={!!union} label={`Edit marriage of ${label}`} onClose={onClose}>
      {flow.suggested ? (
        <SuggestedDone onClose={onClose} />
      ) : (
        union && (
          <div className="space-y-5">
            <SheetTitle>{label}</SheetTitle>
            <div>
              <Field label="Married">
                <FamilyDateInput label="Married" value={marriage} onChange={setMarriage} />
              </Field>
              <FieldSuggestions items={marriageHints} />
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-ink-soft">
                  Wedding album
                </span>
                <span className="text-[13px] text-ink-faint">
                  {album.length === 0
                    ? 'no photos yet'
                    : `${album.length} — first one leads`}
                </span>
              </div>
              {album.map((photo, i) => (
                <PhotoSlot
                  key={`${photo.path || 'new'}-${i}`}
                  label={i === 0 ? 'Leading photo' : `Photo ${i + 1}`}
                  value={photo}
                  file={albumFiles[i] ?? null}
                  withCaption
                  aspect={16 / 9}
                  onPickFile={(f) =>
                    setAlbumFiles((fs) => fs.map((x, j) => (j === i ? f : x)))
                  }
                  onChange={(next) =>
                    setAlbum((a) => a.map((x, j) => (j === i ? (next ?? x) : x)))
                  }
                  onRemove={() => {
                    setAlbum((a) => a.filter((_, j) => j !== i));
                    setAlbumFiles((fs) => fs.filter((_, j) => j !== i));
                  }}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  setAlbum((a) => [...a, { path: '' }]);
                  setAlbumFiles((fs) => [...fs, null]);
                }}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line bg-transparent text-[15px] font-medium text-ink-faint"
              >
                + Add another photo
              </button>
            </div>
            {children.length > 1 && (
              <div>
                <span className="mb-2 block text-sm font-medium text-ink-soft">
                  Children — eldest first
                </span>
                <ul className="m-0 grid list-none gap-2 p-0">
                  {children.map((cid, i) => (
                    <li
                      key={cid}
                      className="flex items-center gap-2 rounded-xl border border-line bg-paper py-1.5 pl-4 pr-2"
                    >
                      <span className="min-w-0 flex-1 truncate text-[15px]">
                        {data.people[cid]?.name.en ?? cid}
                      </span>
                      <button
                        type="button"
                        aria-label="Move up"
                        disabled={i === 0}
                        onClick={() => move(i, -1)}
                        className="grid size-10 place-items-center rounded-full text-ink-soft disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label="Move down"
                        disabled={i === children.length - 1}
                        onClick={() => move(i, 1)}
                        className="grid size-10 place-items-center rounded-full text-ink-soft disabled:opacity-30"
                      >
                        ↓
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <ErrorLine error={flow.error} />
            <SheetActions
              busy={flow.busy}
              primaryLabel={role === 'admin' ? 'Save' : 'Send for approval'}
              busyLabel={flow.progress ?? 'Saving…'}
              onPrimary={() => flow.run(save)}
              onCancel={onClose}
              destructive={
                <DeleteBlock
                  what={`the family page of ${label}`}
                  busy={flow.busy}
                  onDelete={() => flow.run(remove)}
                />
              }
            />
          </div>
        )
      )}
    </Sheet>
  );
}

// ————————————————— Add child —————————————————

export function AddChildSheet({
  data,
  union,
  onClose,
}: {
  data: FamilyData;
  union: Union | null;
  onClose: () => void;
}) {
  const { role, submit } = useChangeSubmit();
  const [nameEn, setNameEn] = useState('');
  const [nameNative, setNameNative] = useState('');
  const [gender, setGender] = useState<'m' | 'f' | ''>('');
  const [birth, setBirth] = useState<FamilyDate>({});
  const flow = useSubmitFlow(onClose);

  useEffect(() => {
    setNameEn('');
    setNameNative('');
    setGender('');
    setBirth({});
    flow.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [union]);

  async function save(): Promise<SubmitOutcome> {
    if (!union || !nameEn.trim()) throw new Error('A name is needed');
    const id = newPersonId(nameEn, new Set(Object.keys(data.people)));
    const person = {
      id,
      name: { en: nameEn.trim(), ...(nameNative.trim() ? { native: nameNative.trim() } : {}) },
      ...(gender ? { gender } : {}),
      ...(normalizeDate(birth) ? { birth: normalizeDate(birth) } : {}),
    } as Person;
    const coupleLabel = (union.partners as string[])
      .map((p) => data.people[p]?.name.en)
      .join(' & ');
    return submit({ kind: 'union.addChild', unionId: union.id, person }, coupleLabel);
  }

  return (
    <Sheet open={!!union} label="Add a child" onClose={onClose}>
      {flow.suggested ? (
        <SuggestedDone onClose={onClose} />
      ) : (
        <div className="space-y-5">
          <div>
            <SheetTitle>Add a child</SheetTitle>
            <p className="m-0 text-[15px] leading-relaxed text-ink-soft">
              Just the name is enough to begin — everything else can come later.
            </p>
          </div>
          <TextField label="Name (English)" value={nameEn} onChange={setNameEn} />
          {pack.langTag && (
            <TextField
              label={`Name (${pack.languageName})`}
              lang={pack.langTag}
              value={nameNative}
              onChange={setNameNative}
            />
          )}
          <div>
            <span className="mb-2 block text-sm font-medium text-ink-soft">Son or daughter</span>
            <div className="flex gap-2">
              {(['m', 'f'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setGender((cur) => (cur === g ? '' : g))}
                  aria-pressed={gender === g}
                  className={`min-h-12 flex-1 rounded-xl border font-medium ${
                    gender === g
                      ? 'border-pasupu bg-pasupu-soft text-nili-deep'
                      : 'border-line bg-paper text-ink-soft'
                  }`}
                >
                  {g === 'm' ? 'Son' : 'Daughter'}
                </button>
              ))}
            </div>
          </div>
          <Field label="Born">
            <FamilyDateInput label="Born" value={birth} onChange={setBirth} />
          </Field>
          <ErrorLine error={flow.error} />
          <SheetActions
            busy={flow.busy}
            disabled={!nameEn.trim()}
            primaryLabel={role === 'admin' ? 'Add child' : 'Send for approval'}
            busyLabel="Adding…"
            onPrimary={() => flow.run(save)}
            onCancel={onClose}
          />
        </div>
      )}
    </Sheet>
  );
}

// ————————————————— Start a family —————————————————

export function StartFamilySheet({
  data,
  person,
  onClose,
}: {
  data: FamilyData;
  person: Person | null;
  onClose: () => void;
}) {
  const { role, submit } = useChangeSubmit();
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [spouseEn, setSpouseEn] = useState('');
  const [spouseNative, setSpouseNative] = useState('');
  const [query, setQuery] = useState('');
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [marriage, setMarriage] = useState<FamilyDate>({});
  const flow = useSubmitFlow(onClose);

  useEffect(() => {
    setMode('new');
    setSpouseEn('');
    setSpouseNative('');
    setQuery('');
    setPickedId(null);
    setMarriage({});
    flow.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person]);

  /** Candidates: everyone else who isn't already married. */
  const candidates = useMemo(() => {
    if (!person) return [];
    return allPeopleSorted(data)
      .filter((p) => p.id !== person.id && !homeUnionOf(data, p.id))
      .filter((p) => matchesQuery(p, query))
      .slice(0, 8);
  }, [data, person, query]);

  async function save(): Promise<SubmitOutcome> {
    if (!person) throw new Error('No person');
    const unionIds = new Set(Object.keys(data.unions));
    if (mode === 'existing') {
      if (!pickedId) throw new Error('Choose who they married');
      const spouse = data.people[pickedId];
      const union: Union = {
        id: newUnionId(person.name.en, spouse.name.en, unionIds),
        partners: [person.id, pickedId],
        marriage: normalizeDate(marriage),
        children: [],
      };
      return submit({ kind: 'family.link', spouseId: pickedId, union }, person.name.en);
    }
    if (!spouseEn.trim()) throw new Error('A spouse name is needed');
    const spouseId = newPersonId(spouseEn, new Set(Object.keys(data.people)));
    const spouse = {
      id: spouseId,
      name: { en: spouseEn.trim(), ...(spouseNative.trim() ? { native: spouseNative.trim() } : {}) },
    } as Person;
    const union: Union = {
      id: newUnionId(person.name.en, spouseEn, unionIds),
      partners: [person.id, spouseId],
      marriage: normalizeDate(marriage),
      children: [],
    };
    return submit({ kind: 'family.start', spouse, union }, person.name.en);
  }

  return (
    <Sheet open={!!person} label={`Start ${person?.name.en ?? ''}'s family`} onClose={onClose}>
      {flow.suggested ? (
        <SuggestedDone onClose={onClose} />
      ) : (
        person && (
          <div className="space-y-5">
            <SheetTitle>{person.name.en}&rsquo;s marriage</SheetTitle>

            <div className="flex gap-2">
              {(
                [
                  ['new', 'Someone new'],
                  ['existing', 'Already in the tree'],
                ] as const
              ).map(([m, lbl]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  aria-pressed={mode === m}
                  className={`min-h-12 flex-1 rounded-xl border text-[15px] font-medium ${
                    mode === m
                      ? 'border-pasupu bg-pasupu-soft text-nili-deep'
                      : 'border-line bg-paper text-ink-soft'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>

            {mode === 'new' ? (
              <>
                <TextField
                  label="Spouse's name (English)"
                  value={spouseEn}
                  onChange={setSpouseEn}
                />
                {pack.langTag && (
                  <TextField
                    label={`Spouse's name (${pack.languageName})`}
                    lang={pack.langTag}
                    value={spouseNative}
                    onChange={setSpouseNative}
                  />
                )}
              </>
            ) : (
              <div>
                <TextField
                  label="Find them in the family"
                  value={query}
                  onChange={(v) => {
                    setQuery(v);
                    setPickedId(null);
                  }}
                  placeholder="Search by name…"
                  hint="Only people without a family page of their own are listed."
                />
                <ul className="m-0 mt-3 grid list-none gap-2 p-0">
                  {candidates.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setPickedId(c.id)}
                        aria-pressed={pickedId === c.id}
                        className={`w-full rounded-xl border px-4 py-3 text-left text-[15px] ${
                          pickedId === c.id
                            ? 'border-pasupu bg-pasupu-soft text-nili-deep'
                            : 'border-line bg-paper text-ink-soft'
                        }`}
                      >
                        {c.name.en}
                        {c.name.native && (
                          <span lang={pack.langTag} className="ml-2 text-sm opacity-70">
                            {c.name.native}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                  {candidates.length === 0 && (
                    <li className="text-[15px] text-ink-faint">No one matches.</li>
                  )}
                </ul>
              </div>
            )}

            <Field label="Married">
              <FamilyDateInput label="Married" value={marriage} onChange={setMarriage} />
            </Field>
            <ErrorLine error={flow.error} />
            <SheetActions
              busy={flow.busy}
              disabled={mode === 'new' ? !spouseEn.trim() : !pickedId}
              primaryLabel={role === 'admin' ? 'Create their family page' : 'Send for approval'}
              busyLabel="Saving…"
              onPrimary={() => flow.run(save)}
              onCancel={onClose}
            />
          </div>
        )
      )}
    </Sheet>
  );
}
