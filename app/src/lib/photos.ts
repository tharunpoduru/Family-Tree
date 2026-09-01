/**
 * Photo resolution: person/union docs store Storage *paths* (durable,
 * survives token rotation); the UI resolves them to download URLs and
 * prefers the resized webp variant (PRD R7 — never ship originals).
 * Resolution is memoized for the session.
 */
import { getDownloadURL, ref } from 'firebase/storage';
import { useEffect, useState } from 'react';
import { storage } from './firebase-data';

export type PhotoSize = 400 | 1600;

const cache = new Map<string, Promise<string>>();

function variantPath(path: string, size: PhotoSize): string {
  const dot = path.lastIndexOf('.');
  const stem = dot === -1 ? path : path.slice(0, dot);
  return `${stem}_${size}x${size}.webp`;
}

/** Resolve a stored path (or pass through a full URL) to a display URL. */
export function resolvePhoto(path: string, size: PhotoSize): Promise<string> {
  if (/^https?:\/\//.test(path)) return Promise.resolve(path);
  const key = `${path}@${size}`;
  let p = cache.get(key);
  if (!p) {
    p = getDownloadURL(ref(storage, variantPath(path, size)))
      // Variant may not exist yet (resize runs async) — fall back to original.
      .catch(() => getDownloadURL(ref(storage, path)));
    cache.set(key, p);
  }
  return p;
}

export function usePhotoUrl(
  path: string | undefined,
  size: PhotoSize,
): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    let live = true;
    setUrl(undefined);
    if (path)
      resolvePhoto(path, size).then((u) => {
        if (live) setUrl(u);
      }).catch(() => {});
    return () => {
      live = false;
    };
  }, [path, size]);
  return url;
}
