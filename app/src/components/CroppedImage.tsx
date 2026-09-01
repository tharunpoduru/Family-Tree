/**
 * Renders a photo through its stored framing rectangle.
 *
 * The rectangle may extend beyond the photo (x < 0, w > 1) when someone
 * chose to show a tall or wide photo whole — in that case the uncovered
 * area is filled with a blurred copy of the photo itself, matching what
 * the crop editor previewed. With no crop stored, falls back to a
 * centred cover.
 */
import type { PhotoCrop } from '../types/family';

/** True when the framing shows area outside the photo. */
function isLetterboxed(crop: PhotoCrop): boolean {
  const e = 0.001;
  return (
    crop.x < -e || crop.y < -e || crop.x + crop.w > 1 + e || crop.y + crop.h > 1 + e
  );
}

export function CroppedImage({
  src,
  crop,
  alt,
  className = '',
  loading = 'lazy',
}: {
  src: string;
  crop?: PhotoCrop;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
}) {
  if (!crop) {
    return (
      <img
        src={src}
        alt={alt}
        loading={loading}
        className={`h-full w-full object-cover ${className}`}
      />
    );
  }
  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`}>
      {isLetterboxed(crop) && (
        <img
          src={src}
          alt=""
          aria-hidden
          loading={loading}
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl brightness-90"
        />
      )}
      {/* Scale the photo so the framing rectangle fills the box, then
          shift it so the rectangle's origin sits at the top-left. */}
      <img
        src={src}
        alt={alt}
        loading={loading}
        className="absolute max-w-none"
        style={{
          width: `${100 / crop.w}%`,
          height: `${100 / crop.h}%`,
          left: `${(-crop.x * 100) / crop.w}%`,
          top: `${(-crop.y * 100) / crop.h}%`,
        }}
      />
    </div>
  );
}
