"use client";

import { useEffect, useRef, useState } from "react";
import { prepare, layout } from "@chenglou/pretext";

export type ClampInfo = {
  /** Lines the full text needs at the element's measured content width. */
  lineCount: number;
  /** True once we know the text exceeds `maxLines` (i.e. CSS is clamping it). */
  isClamped: boolean;
  /** How many lines are hidden beyond the clamp (0 when not clamped). */
  hiddenLines: number;
};

const INITIAL: ClampInfo = { lineCount: 0, isClamped: false, hiddenLines: 0 };

/**
 * Reports how a block of text wraps at its container's *real* rendered width,
 * using pretext: it measures glyph widths once on a canvas and then computes
 * the line breaks with pure arithmetic — no DOM reflow, no shadow element, no
 * binary-searching widths.
 *
 * We use it to turn the cards' CSS `line-clamp` from a blind truncation into a
 * measured one: we get the exact overflow so the UI can say "+2 lines" instead
 * of guessing.
 *
 * The only DOM reads happen inside `measure()` (once on mount, then on resize
 * via ResizeObserver) — everything pretext does afterwards is arithmetic.
 */
export function usePretextClamp<T extends HTMLElement = HTMLElement>(
  text: string,
  maxLines: number,
) {
  const ref = useRef<T | null>(null);
  const [info, setInfo] = useState<ClampInfo>(INITIAL);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const cs = getComputedStyle(el);

      // pretext wants a Canvas2D font shorthand. Build it from computed style
      // so we measure with the exact font the browser will paint.
      const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;

      const fontSize = parseFloat(cs.fontSize);
      // line-height can come back as "normal", a unitless ratio, or px
      // depending on the browser — normalise to px.
      const rawLineHeight = parseFloat(cs.lineHeight);
      const lineHeight = !Number.isFinite(rawLineHeight)
        ? fontSize * 1.2 // "normal" ≈ 1.2 in most UAs
        : rawLineHeight < fontSize
          ? rawLineHeight * fontSize // unitless ratio (e.g. "1.625")
          : rawLineHeight; // already px

      const letterSpacing = parseFloat(cs.letterSpacing) || 0;
      // Content-box width — exclude padding so wrapping matches the text area.
      const width =
        el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);

      if (!Number.isFinite(lineHeight) || width <= 0) return;

      const prepared = prepare(text, font, { letterSpacing });
      const { lineCount } = layout(prepared, width, lineHeight);

      setInfo({
        lineCount,
        isClamped: lineCount > maxLines,
        hiddenLines: Math.max(0, lineCount - maxLines),
      });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, maxLines]);

  return { ref, ...info } as const;
}
