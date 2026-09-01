/**
 * Crop editor — drag to position, pinch or slide to zoom, free of any
 * "must fill the frame" restriction.
 *
 * Zoom runs from *fit* (the whole photo visible, whatever its shape) up
 * to 4× fill, so a tall portrait works as well as a wide landscape. When
 * the photo doesn't cover the frame, the remainder is filled with a
 * blurred copy of the photo itself — the same treatment used at display
 * time, so what you frame is exactly what the family sees.
 *
 * Non-destructive: the original upload is never altered. We store a
 * normalized rectangle in source coordinates, which is allowed to extend
 * beyond the image (x < 0, w > 1) to describe a letterboxed framing.
 */
import { useEffect, useRef, useState } from 'react';
import type { PhotoCrop } from '../../types/family';

interface Pointer {
  id: number;
  x: number;
  y: number;
}

const MAX_FILL_MULTIPLE = 4;

export function CropEditor({
  src,
  aspect,
  value,
  onChange,
  title,
  round,
}: {
  src: string;
  /** width / height of the target frame */
  aspect: number;
  value?: PhotoCrop;
  onChange: (crop: PhotoCrop) => void;
  title: string;
  round?: boolean;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [frame, setFrame] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  /** Multiplier on "fit": 1 = whole photo visible. */
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pointers = useRef<Map<number, Pointer>>(new Map());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  /**
   * Touch starts locked so a scroll that lands on the photo scrolls the
   * sheet instead of dragging the frame; a deliberate tap arms editing.
   * Mouse drags never fight scrolling, so they arm on first press.
   */
  const [armed, setArmed] = useState(false);
  const tapStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => setFrame({ w: el.clientWidth, h: el.clientWidth / aspect });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [aspect]);

  const ready = !!natural && frame.w > 0;
  // Whole photo visible.
  const fitScale = ready ? Math.min(frame.w / natural!.w, frame.h / natural!.h) : 1;
  // Photo fills the frame.
  const coverScale = ready ? Math.max(frame.w / natural!.w, frame.h / natural!.h) : 1;
  const fillZoom = fitScale ? coverScale / fitScale : 1;
  const maxZoom = fillZoom * MAX_FILL_MULTIPLE;

  const scale = fitScale * zoom;
  const imgW = natural ? natural.w * scale : 0;
  const imgH = natural ? natural.h * scale : 0;

  /**
   * Keep the photo meaningfully in view. When it's larger than the frame
   * it may not reveal empty edges; when it's smaller it may sit anywhere
   * inside the frame.
   */
  function clamp(next: { x: number; y: number }, w = imgW, h = imgH) {
    const xs = [0, frame.w - w];
    const ys = [0, frame.h - h];
    return {
      x: Math.min(Math.max(next.x, Math.min(...xs)), Math.max(...xs)),
      y: Math.min(Math.max(next.y, Math.min(...ys)), Math.max(...ys)),
    };
  }

  function center(w: number, h: number) {
    return { x: (frame.w - w) / 2, y: (frame.h - h) / 2 };
  }

  // Seed from an existing crop, else open filling the frame.
  useEffect(() => {
    if (!ready) return;
    if (value) {
      const s = frame.w / (value.w * natural!.w);
      const z = s / fitScale;
      const w = natural!.w * s;
      const h = natural!.h * s;
      setZoom(z);
      setOffset({ x: -value.x * w, y: -value.y * h });
    } else {
      const w = natural!.w * coverScale;
      const h = natural!.h * coverScale;
      setZoom(fillZoom);
      setOffset(center(w, h));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, frame.w, frame.h, natural]);

  // Publish the framing. The rectangle may extend past the photo, which
  // is exactly how a letterboxed framing is described.
  useEffect(() => {
    if (!ready || !imgW) return;
    onChange({
      x: -offset.x / imgW,
      y: -offset.y / imgH,
      w: frame.w / imgW,
      h: frame.h / imgH,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset.x, offset.y, imgW, imgH, frame.w, frame.h, ready]);

  function setZoomAround(nextZoom: number) {
    const z = Math.min(maxZoom, Math.max(1, nextZoom));
    setZoom((prev) => {
      if (!natural) return z;
      // Keep the frame's centre point steady while zooming.
      const prevW = natural.w * fitScale * prev;
      const prevH = natural.h * fitScale * prev;
      const nextW = natural.w * fitScale * z;
      const nextH = natural.h * fitScale * z;
      setOffset((o) => {
        const cx = (frame.w / 2 - o.x) / (prevW || 1);
        const cy = (frame.h / 2 - o.y) / (prevH || 1);
        return clamp(
          { x: frame.w / 2 - cx * nextW, y: frame.h / 2 - cy * nextH },
          nextW,
          nextH,
        );
      });
      return z;
    });
  }

  function onPointerDown(e: React.PointerEvent) {
    if (!armed) {
      if (e.pointerType !== 'mouse') {
        // Unarmed touch: no capture — the browser keeps the scroll. A
        // finger that stays put becomes the arming tap in onPointerUp.
        tapStart.current = { x: e.clientX, y: e.clientY };
        return;
      }
      setArmed(true);
    }
    (e.target as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { id: e.pointerId, x: e.clientX, y: e.clientY });
  }

  function onPointerMove(e: React.PointerEvent) {
    const map = pointers.current;
    const prev = map.get(e.pointerId);
    if (!prev) return;
    const now = { id: e.pointerId, x: e.clientX, y: e.clientY };

    if (map.size >= 2) {
      const before = [...map.values()];
      map.set(e.pointerId, now);
      const after = [...map.values()];
      const dist = (a: Pointer[]) => Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
      if (!pinch.current) pinch.current = { dist: dist(before), zoom };
      setZoomAround(pinch.current.zoom * (dist(after) / (pinch.current.dist || 1)));
      return;
    }

    map.set(e.pointerId, now);
    setOffset((o) => clamp({ x: o.x + (now.x - prev.x), y: o.y + (now.y - prev.y) }));
  }

  function onPointerUp(e: React.PointerEvent) {
    if (tapStart.current) {
      // Only a true pointerup arms — a pointercancel means the browser
      // claimed the gesture for scrolling.
      const still =
        e.type === 'pointerup' &&
        Math.hypot(e.clientX - tapStart.current.x, e.clientY - tapStart.current.y) < 8;
      if (still) setArmed(true);
      tapStart.current = null;
    }
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  function fitWhole() {
    if (!natural) return;
    const w = natural.w * fitScale;
    const h = natural.h * fitScale;
    setZoom(1);
    setOffset(center(w, h));
  }

  function fillFrame() {
    if (!natural) return;
    const w = natural.w * coverScale;
    const h = natural.h * coverScale;
    setZoom(fillZoom);
    setOffset(center(w, h));
  }

  const letterboxed =
    ready && (imgW < frame.w - 0.5 || imgH < frame.h - 0.5);

  return (
    <div className="space-y-3">
      <p className="m-0 text-sm font-medium text-ink-soft">{title}</p>
      <div
        ref={frameRef}
        className={`relative w-full select-none overflow-hidden bg-ink/10 ${
          armed ? 'touch-none' : 'touch-pan-y'
        } ${round ? 'rounded-full' : 'rounded-2xl'}`}
        style={{ aspectRatio: String(aspect) }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {/* Blurred fill for whatever the photo doesn't cover. */}
        {letterboxed && (
          <img
            src={src}
            alt=""
            aria-hidden
            draggable={false}
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-xl brightness-90"
          />
        )}
        <img
          src={src}
          alt=""
          draggable={false}
          onLoad={(e) =>
            setNatural({
              w: e.currentTarget.naturalWidth,
              h: e.currentTarget.naturalHeight,
            })
          }
          className="absolute origin-top-left"
          style={{
            width: imgW ? `${imgW}px` : 'auto',
            height: imgH ? `${imgH}px` : 'auto',
            transform: `translate(${offset.x}px, ${offset.y}px)`,
            maxWidth: 'none',
          }}
        />
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 ring-2 ring-inset ring-[#fffdf8]/70 ${
            round ? 'rounded-full' : 'rounded-2xl'
          }`}
        />
        {ready && !armed && (
          <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center">
            <span className="rounded-full bg-ink/60 px-4 py-2 text-[13px] font-medium text-[#fffdf8] backdrop-blur-sm">
              Tap to adjust
            </span>
          </div>
        )}
        {armed && (
          <button
            type="button"
            onClick={() => setArmed(false)}
            onPointerDown={(e) => e.stopPropagation()}
            className="absolute right-2 top-2 z-10 min-h-9 rounded-full bg-ink/60 px-3.5 text-[13px] font-medium text-[#fffdf8] backdrop-blur-sm"
          >
            ✓ Done
          </button>
        )}
      </div>

      <label className="flex items-center gap-3">
        <span className="text-[13px] text-ink-faint">Zoom</span>
        <input
          type="range"
          min={1}
          max={maxZoom}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoomAround(Number(e.target.value))}
          aria-label="Zoom"
          className="h-11 flex-1 accent-[var(--color-nili)]"
        />
      </label>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={fitWhole}
          className="min-h-10 flex-1 rounded-full border border-line bg-card px-4 text-[13px] font-medium text-ink-soft"
        >
          Show whole photo
        </button>
        <button
          type="button"
          onClick={fillFrame}
          className="min-h-10 flex-1 rounded-full border border-line bg-card px-4 text-[13px] font-medium text-ink-soft"
        >
          Fill the frame
        </button>
      </div>

      <p className="m-0 text-[13px] leading-relaxed text-ink-faint">
        {armed
          ? 'Drag to position, pinch or slide to zoom. Zoom out to show a tall photo whole — the sides fill softly. The original is never altered.'
          : 'Tap the photo to adjust its framing — until then, scrolling never moves it.'}
      </p>
    </div>
  );
}
