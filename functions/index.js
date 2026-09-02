/**
 * Photo resize pipeline (PRD R7/R8) — a gen2 Cloud Function.
 *
 * On upload to photos/ or suggestions/: writes 400x400 and 1600x1600
 * bounded webp variants next to the original (same naming convention the
 * app's photo resolver expects). Originals are never deleted — they are
 * the archive.
 *
 * Listens on the project's DEFAULT storage bucket, so nothing here needs
 * editing per family. REGION should match where you created Firestore
 * and Storage (see docs/SETUP.md).
 */
const { onObjectFinalized } = require('firebase-functions/v2/storage');
const { initializeApp } = require('firebase-admin/app');
const { getStorage } = require('firebase-admin/storage');
const sharp = require('sharp');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs/promises');

initializeApp();

const REGION = 'asia-south1';
const SIZES = [400, 1600];
const VARIANT_RE = /_\d+x\d+\.webp$/;

exports.resizeImage = onObjectFinalized(
  {
    region: REGION,
    // Originals are welcome up to 100 MB (professional wedding photos), and
    // a decoded 40 MB JPEG can need several hundred MB — hence the headroom.
    memory: '2GiB',
    timeoutSeconds: 300,
    maxInstances: 3,
  },
  async (event) => {
    const filePath = event.data.name || '';
    const contentType = event.data.contentType || '';

    if (!contentType.startsWith('image/')) return;
    if (!filePath.startsWith('photos/') && !filePath.startsWith('suggestions/')) return;
    if (VARIANT_RE.test(filePath)) return; // already a variant

    const bucket = getStorage().bucket(event.data.bucket);
    // Stream the original to disk rather than holding it in memory next to
    // its decoded pixels; sharp reads from the path.
    const tmp = path.join(os.tmpdir(), `${Date.now()}-${path.basename(filePath)}`);
    await bucket.file(filePath).download({ destination: tmp });

    const dot = filePath.lastIndexOf('.');
    const stem = dot === -1 ? filePath : filePath.slice(0, dot);

    try {
      await Promise.all(
        SIZES.map(async (size) => {
          const resized = await sharp(tmp)
            .rotate() // honor EXIF orientation
            .resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 78 })
            .toBuffer();
          await bucket.file(`${stem}_${size}x${size}.webp`).save(resized, {
            contentType: 'image/webp',
            metadata: { cacheControl: 'public, max-age=31536000, immutable' },
          });
        }),
      );
      console.log(`Resized ${filePath} → ${SIZES.map((s) => `${s}px`).join(', ')}`);
    } finally {
      await fs.unlink(tmp).catch(() => {});
    }
  },
);
