/**
 * A swipeable album. No arrows — swipe on a phone, trackpad-swipe or
 * drag on a desktop, with scroll-snap doing the work natively so it
 * feels like the photo app people already know.
 */
import { useEffect, useRef, useState } from 'react';
import type { PhotoRef } from '../types/family';
import { usePhotoUrl } from '../lib/photos';
import { CroppedImage } from './CroppedImage';

function Slide({ photo, alt, eager }: { photo: PhotoRef; alt: string; eager: boolean }) {
  const url = usePhotoUrl(photo.path, 1600);
  return (
    <div className="w-full shrink-0 snap-center">
      <div className="aspect-video w-full bg-ink/10">
        {url && (
          <CroppedImage
            src={url}
            crop={photo.crop}
            alt={alt}
            loading={eager ? 'eager' : 'lazy'}
          />
        )}
      </div>
      {photo.caption && (
        <p className="m-0 bg-card px-5 py-2.5 text-center text-[13px] text-ink-faint">
          {photo.caption}
        </p>
      )}
    </div>
  );
}

export function PhotoAlbum({ photos, alt }: { photos: PhotoRef[]; alt: string }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const onScroll = () => {
      const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
      setIndex(Math.min(photos.length - 1, Math.max(0, i)));
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [photos.length]);

  function goTo(i: number) {
    const el = railRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  }

  if (photos.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={railRef}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
        aria-roledescription="carousel"
        aria-label={alt}
      >
        {photos.map((p, i) => (
          <Slide key={p.path} photo={p} alt={`${alt} — ${i + 1} of ${photos.length}`} eager={i === 0} />
        ))}
      </div>
      {photos.length > 1 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
          {photos.map((p, i) => (
            <button
              key={p.path}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Photo ${i + 1}`}
              aria-current={i === index}
              className={`pointer-events-auto size-2 rounded-full ring-1 ring-ink/20 transition-all ${
                i === index ? 'w-5 bg-[#fffdf8]' : 'bg-[#fffdf8]/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
