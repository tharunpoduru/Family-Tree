/**
 * Photo uploads: resumable, observable, and never silently stuck.
 *
 * The one-shot `uploadBytes` has no timeout — if a phone's connection
 * swallows the response, the promise never settles and the UI spins on
 * "Saving…" forever. This helper uses the resumable protocol (chunked,
 * survives a dropped connection), reports byte-level progress, and gives
 * up loudly when no bytes have moved for a while.
 *
 * Large photos are welcome: the original is the family's archive, and a
 * professional's wedding photo can run 20–40 MB. Only videos and
 * non-images are turned away.
 */
import { ref, uploadBytesResumable, type UploadMetadata } from 'firebase/storage';
import { storage } from './firebase-data';

/** Generous on purpose — see the module note. Mirrored in storage.rules. */
export const MAX_PHOTO_BYTES = 100 * 1024 * 1024;
/** No bytes moved for this long means the connection is stuck. */
const STALL_MS = 30_000;

export interface UploadDetails {
  path: string;
  size: number;
  type: string;
  name?: string;
  /** Bytes that had made it before the upload gave up. */
  transferred?: number;
}

export class UploadError extends Error {
  code: string;
  details: UploadDetails;
  constructor(code: string, message: string, details: UploadDetails) {
    super(message);
    this.name = 'UploadError';
    this.code = code;
    this.details = details;
  }
}

const EXT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  heic: 'image/heic',
  heif: 'image/heif',
  avif: 'image/avif',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  bmp: 'image/bmp',
};

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot === -1 ? '' : name.slice(dot + 1).toLowerCase();
}

/**
 * Some phone browsers hand over a File with an empty `type`. Fall back to
 * the extension so Storage rules and the resize function still see an
 * image.
 */
export function guessContentType(file: File): string {
  if (file.type) return file.type;
  return EXT_TYPES[fileExtension(file.name)] ?? '';
}

function mb(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0);
}

/** Throws a friendly UploadError for anything that isn't a photo we can take. */
export function checkPhotoFile(file: File): void {
  const details: UploadDetails = {
    path: '',
    size: file.size,
    type: file.type,
    name: file.name,
  };
  const type = guessContentType(file);
  if (!type.startsWith('image/')) {
    throw new UploadError(
      'not-an-image',
      'That file is not a photo. Please choose an image (JPG, PNG, HEIC or WebP).',
      details,
    );
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new UploadError(
      'too-large',
      `That photo is ${mb(file.size)} MB. The limit is ${mb(MAX_PHOTO_BYTES)} MB.`,
      details,
    );
  }
}

/**
 * Upload bytes to a Storage path. Resolves when the object is fully
 * written; rejects with an UploadError that names what went wrong.
 */
export function uploadImage(
  path: string,
  data: Blob | Uint8Array,
  opts: { contentType?: string; onProgress?: (fraction: number) => void } = {},
): Promise<void> {
  const metadata: UploadMetadata | undefined = opts.contentType
    ? { contentType: opts.contentType }
    : undefined;
  const size = data instanceof Blob ? data.size : data.byteLength;
  const details: UploadDetails = {
    path,
    size,
    type: opts.contentType ?? (data instanceof Blob ? data.type : ''),
    name: data instanceof File ? data.name : undefined,
  };
  const task = uploadBytesResumable(ref(storage, path), data, metadata);

  return new Promise<void>((resolve, reject) => {
    let lastMovement = Date.now();
    let transferred = 0;
    let stalled = false;
    const watchdog = setInterval(() => {
      if (Date.now() - lastMovement > STALL_MS) {
        stalled = true;
        task.cancel();
      }
    }, 2_000);
    const done = () => clearInterval(watchdog);

    task.on(
      'state_changed',
      (snap) => {
        if (snap.bytesTransferred !== transferred) {
          transferred = snap.bytesTransferred;
          lastMovement = Date.now();
        }
        opts.onProgress?.(snap.totalBytes ? snap.bytesTransferred / snap.totalBytes : 0);
      },
      (err) => {
        done();
        const info = { ...details, transferred };
        if (stalled) {
          reject(
            new UploadError(
              'stalled',
              `The upload stalled — nothing moved for ${STALL_MS / 1000} seconds. ` +
                'Check your connection (try switching between Wi‑Fi and mobile data) and try again.',
              info,
            ),
          );
          return;
        }
        const code = (err as { code?: string }).code ?? 'unknown';
        reject(new UploadError(code, friendlyMessage(code, err.message), info));
      },
      () => {
        done();
        resolve();
      },
    );
  });
}

function friendlyMessage(code: string, fallback: string): string {
  switch (code) {
    case 'storage/unauthorized':
      return 'You are not allowed to upload here. If you were recently approved, sign out and back in.';
    case 'storage/retry-limit-exceeded':
      return 'The upload kept failing. Check your connection and try again.';
    case 'storage/canceled':
      return 'The upload was cancelled.';
    case 'storage/quota-exceeded':
      return 'The family storage is full. Please tell an admin.';
    default:
      return `${fallback} (${code})`;
  }
}
