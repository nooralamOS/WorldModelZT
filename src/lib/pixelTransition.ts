// Pixel blast-wave page transition.
//
// On a tab switch we freeze a clone of the outgoing #article-content into a
// fixed overlay, then dissolve it away from the toggle outward. A single thin
// white pixel ring expands as a stable circle from the toggle; cells the ring
// has passed are punched out of the clone, revealing the freshly-swapped page
// beneath. No translucent trail — just the leading white front.
//
// The clone is a plain deep DOM copy — no screenshot library — so it's cheap and
// pixel-accurate. The globe canvas and docked title live outside #article-content
// (they're shared between tabs), so they sit beneath the overlay unchanged.

const MASK_CELL = 12; // screen px per pixel-cell
const COVER_MS = 640; // front sweep duration
const FRONT_GROW = 1.04; // overshoot so the far corners fully clear
const BAND_PX = 16; // thickness of the white front ring

type Opts = { originX: number; originY: number; onDone?: () => void };

export function runPixelTransition({ originX, originY, onDone }: Opts): () => void {
  if (typeof window === "undefined") {
    onDone?.();
    return () => {};
  }
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const source = document.getElementById("article-content");
  if (reduce || !source) {
    onDone?.();
    return () => {};
  }

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const rect = source.getBoundingClientRect();

  // ── Overlay: frozen clone of the outgoing content + the spark canvas ──
  const overlay = document.createElement("div");
  overlay.setAttribute("aria-hidden", "true");
  overlay.style.cssText =
    "position:fixed;inset:0;z-index:40;pointer-events:none;overflow:hidden;";

  // Opaque snapshot of the outgoing page: the clone is plain DOM (transparent
  // where the old view had empty space), so without a solid backdrop the live
  // incoming content would show through those gaps *outside* the wave. An opaque
  // panel matching the page background over the content box keeps the outside of
  // the front a fully frozen old page until the wave reveals the new one.
  const pageBg = getComputedStyle(document.body).backgroundColor || "#00158c";
  const cloneWrap = document.createElement("div");
  // translateZ(0) makes this a containing block for any position:fixed clone
  // descendants (the GSAP-pinned TLDR cards), so they're clipped + masked here
  // instead of escaping to the viewport.
  cloneWrap.style.cssText =
    "position:absolute;inset:0;overflow:hidden;transform:translateZ(0);";
  const clone = source.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  // Strip ALL ids from the snapshot. It's a throwaway visual copy, but a deep
  // clone duplicates descendant ids (e.g. #article-title) — and while the
  // overlay is alive, document.getElementById can resolve to this dead clone,
  // which corrupts the title's dock-target measurement on the next rebuild.
  clone.querySelectorAll("[id]").forEach((el) => el.removeAttribute("id"));
  clone.style.position = "absolute";
  clone.style.left = `${rect.left}px`;
  clone.style.top = `${rect.top}px`;
  clone.style.width = `${rect.width}px`;
  clone.style.minHeight = `${Math.max(0, vh - rect.top)}px`;
  clone.style.margin = "0";
  clone.style.background = pageBg;
  clone.style.visibility = "visible";
  clone.style.opacity = "1";
  cloneWrap.appendChild(clone);
  overlay.appendChild(cloneWrap);

  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.ceil(vw * dpr);
  canvas.height = Math.ceil(vh * dpr);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = false;
  overlay.appendChild(canvas);

  document.body.appendChild(overlay);

  // ── Pixel grid ──
  // The origin is fixed, so each cell's front-arrival radius is just its
  // distance from the toggle — a stable circle. Precompute it; the per-frame
  // loop only compares it against the growing radius R.
  const cols = Math.ceil(vw / MASK_CELL);
  const rows = Math.ceil(vh / MASK_CELL);
  const total = cols * rows;
  const threshold = new Float32Array(total);
  let maxThreshold = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const cx = c * MASK_CELL + MASK_CELL / 2;
      const cy = r * MASK_CELL + MASK_CELL / 2;
      const dist = Math.hypot(cx - originX, cy - originY);
      threshold[i] = dist;
      if (dist > maxThreshold) maxThreshold = dist;
    }
  }

  // Grid-resolution mask, re-encoded each frame and applied to the clone.
  // RGB and alpha are kept identical (white+opaque = show, black+transparent =
  // hide) so it reads correctly whether the engine masks by luminance or alpha.
  const mask = document.createElement("canvas");
  mask.width = cols;
  mask.height = rows;
  const mctx = mask.getContext("2d")!;
  const maskImg = mctx.createImageData(cols, rows);

  const maxR = maxThreshold * FRONT_GROW;
  const easeOut = (t: number) => 1 - Math.pow(1 - t, 2.2);

  const start = performance.now();
  let raf = 0;
  let killed = false;

  const cleanup = () => {
    if (killed) return;
    killed = true;
    cancelAnimationFrame(raf);
    overlay.remove();
  };

  const frame = (now: number) => {
    const t = Math.min(1, (now - start) / COVER_MS);
    const R = easeOut(t) * maxR;

    ctx.clearRect(0, 0, vw, vh);
    const data = maskImg.data;

    const bandInner = R - BAND_PX;
    ctx.fillStyle = "rgba(255,255,255,0.92)";
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c;
        const th = threshold[i];
        const inside = R >= th;

        const v = inside ? 0 : 255; // 0 → hide clone (show new), 255 → keep old
        const p = i * 4;
        data[p] = v;
        data[p + 1] = v;
        data[p + 2] = v;
        data[p + 3] = v;

        // Thin solid white ring at the leading front — no trail.
        if (inside && th > bandInner) {
          ctx.fillRect(c * MASK_CELL, r * MASK_CELL, MASK_CELL, MASK_CELL);
        }
      }
    }

    mctx.putImageData(maskImg, 0, 0);
    const url = mask.toDataURL();
    cloneWrap.style.webkitMaskImage = `url(${url})`;
    cloneWrap.style.maskImage = `url(${url})`;
    cloneWrap.style.webkitMaskSize = "100% 100%";
    cloneWrap.style.maskSize = "100% 100%";
    cloneWrap.style.webkitMaskRepeat = "no-repeat";
    cloneWrap.style.maskRepeat = "no-repeat";

    if (t >= 1) {
      cleanup();
      onDone?.();
      return;
    }
    raf = requestAnimationFrame(frame);
  };
  raf = requestAnimationFrame(frame);

  return cleanup;
}
