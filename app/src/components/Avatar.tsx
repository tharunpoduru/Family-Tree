/**
 * Portrait avatar. With a photo: the photo. Without: a deterministic
 * "silk" gradient derived from the person's id, with initials set in the
 * display serif — so every person looks intentional, never like a hole
 * where a photo should be (sparse-data dignity).
 */
import type { Person } from '../types/family';
import { initialsOf } from '../lib/format';
import { usePhotoUrl } from '../lib/photos';
import { CroppedImage } from './CroppedImage';

const SILKS = [
  'var(--color-silk-1)',
  'var(--color-silk-2)',
  'var(--color-silk-3)',
  'var(--color-silk-4)',
  'var(--color-silk-5)',
  'var(--color-silk-6)',
];

function hashOf(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function silkGradientFor(id: string): string {
  const h = hashOf(id);
  const a = SILKS[h % SILKS.length];
  const b = SILKS[(h >>> 3) % SILKS.length];
  const angle = 105 + (h % 130);
  return `linear-gradient(${angle}deg, ${a}, ${b})`;
}

const SIZES = {
  sm: 'size-10 text-sm',
  md: 'size-14 text-base',
  lg: 'size-20 text-xl',
  xl: 'size-28 text-3xl',
} as const;

export function Avatar({
  person,
  size = 'md',
  className = '',
}: {
  person: Person;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const base = `${SIZES[size]} shrink-0 rounded-full overflow-hidden ring-2 ring-card shadow-card ${className}`;
  const photoUrl = usePhotoUrl(person.portrait?.path, 400);
  if (person.portrait && photoUrl) {
    return (
      <div className={base}>
        <CroppedImage
          src={photoUrl}
          crop={person.portrait.crop}
          alt={`Portrait of ${person.name.en}`}
        />
      </div>
    );
  }
  return (
    <div
      role="img"
      aria-label={person.name.en}
      className={`${base} grid place-items-center text-card select-none`}
      style={{ background: silkGradientFor(person.id), fontFamily: 'var(--font-display)' }}
    >
      <span className="font-semibold tracking-wide text-[#fffdf8]">
        {initialsOf(person.name.en)}
      </span>
    </div>
  );
}
