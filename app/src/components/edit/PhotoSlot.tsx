/**
 * One photo: pick, frame, caption, remove. Used for both portrait slots
 * and for every photo in a wedding album.
 */
import { useEffect, useState } from 'react';
import type { PhotoRef } from '../../types/family';
import { usePhotoUrl } from '../../lib/photos';
import { CropEditor } from './CropEditor';

export function PhotoSlot({
  label,
  hint,
  value,
  file,
  onPickFile,
  onChange,
  onRemove,
  aspect,
  round,
  withCaption,
}: {
  label: string;
  hint?: string;
  value?: PhotoRef;
  file: File | null;
  onPickFile: (f: File | null) => void;
  onChange: (next: PhotoRef | undefined) => void;
  onRemove: () => void;
  aspect: number;
  round?: boolean;
  withCaption?: boolean;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const existingUrl = usePhotoUrl(file ? undefined : value?.path, 1600);

  useEffect(() => {
    if (!file) {
      setObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const src = objectUrl ?? existingUrl;
  const has = !!file || !!value?.path;

  return (
    <div className="rounded-2xl border border-line bg-paper p-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-ink-soft">{label}</span>
        <label className="ml-auto cursor-pointer whitespace-nowrap rounded-full border border-line bg-card px-4 py-2 text-[13px] font-medium text-ink-soft shadow-card">
          📷 {has ? 'Change' : 'Choose photo'}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {has && (
          <button
            type="button"
            onClick={onRemove}
            className="whitespace-nowrap text-[13px] font-medium text-nili underline-offset-4 hover:underline"
          >
            Remove
          </button>
        )}
      </div>
      {hint && <p className="m-0 mt-1.5 text-[13px] text-ink-faint">{hint}</p>}
      {src && (
        <div className="mt-4">
          <CropEditor
            key={src}
            src={src}
            aspect={aspect}
            round={round}
            title="Frame it"
            value={value?.crop}
            onChange={(crop) => onChange({ path: value?.path ?? '', ...value, crop })}
          />
        </div>
      )}
      {withCaption && has && (
        <input
          value={value?.caption ?? ''}
          onChange={(e) =>
            onChange({ path: value?.path ?? '', ...value, caption: e.target.value || undefined })
          }
          placeholder="Caption (optional)"
          aria-label="Photo caption"
          className="mt-3 w-full rounded-xl border border-line bg-card px-4 py-2.5 text-[15px] outline-none focus:border-pasupu"
        />
      )}
    </div>
  );
}
