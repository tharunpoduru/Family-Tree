/**
 * A portrait that turns over. When a person has both a recent and a
 * younger photo, tapping flips between them — the small delight of
 * finding the same face at two ages. Shows the recent one by default.
 */
import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import type { Person } from '../types/family';
import { usePhotoUrl } from '../lib/photos';
import { CroppedImage } from './CroppedImage';
import { silkGradientFor } from './Avatar';
import { initialsOf } from '../lib/format';

export function PortraitTurn({ person, className = '' }: { person: Person; className?: string }) {
  const [showThen, setShowThen] = useState(false);
  const both = !!person.portrait && !!person.portraitThen;
  const active = showThen && person.portraitThen ? person.portraitThen : person.portrait;
  const url = usePhotoUrl(active?.path, 400);

  const shell = `relative size-32 overflow-hidden rounded-full ring-2 ring-card shadow-float ${className}`;

  if (!active) {
    return (
      <div
        role="img"
        aria-label={person.name.en}
        className={`${shell} grid place-items-center`}
        style={{ background: silkGradientFor(person.id), fontFamily: 'var(--font-display)' }}
      >
        <span className="text-4xl font-semibold text-[#fffdf8]">
          {initialsOf(person.name.en)}
        </span>
      </div>
    );
  }

  const image = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={active.path}
        initial={{ opacity: 0, rotateY: -12, scale: 0.96 }}
        animate={{ opacity: 1, rotateY: 0, scale: 1 }}
        exit={{ opacity: 0, rotateY: 12, scale: 0.96 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
        className="absolute inset-0"
      >
        {url && (
          <CroppedImage
            src={url}
            crop={active.crop}
            loading="eager"
            alt={
              showThen
                ? `${person.name.en} when younger`
                : `Portrait of ${person.name.en}`
            }
          />
        )}
      </motion.div>
    </AnimatePresence>
  );

  if (!both) return <div className={shell}>{image}</div>;

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => setShowThen((v) => !v)}
        aria-label={
          showThen
            ? `Show recent portrait of ${person.name.en}`
            : `Show ${person.name.en} when younger`
        }
        className={`${shell} cursor-pointer transition-transform active:scale-[0.97]`}
        style={{ perspective: 600 }}
      >
        {image}
      </button>
      <span className="flex items-center gap-1.5 text-[13px] text-ink-faint">
        <span
          aria-hidden
          className={`size-1.5 rounded-full ${showThen ? 'bg-line' : 'bg-pasupu'}`}
        />
        <span
          aria-hidden
          className={`size-1.5 rounded-full ${showThen ? 'bg-pasupu' : 'bg-line'}`}
        />
        <span className="ml-1">{showThen ? 'Younger' : 'Tap to see younger'}</span>
      </span>
    </div>
  );
}
