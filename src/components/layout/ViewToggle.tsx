"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

export type ArticleView = "tldr" | "full";

type ViewToggleProps = {
  view: ArticleView;
  onChange: (view: ArticleView) => void;
};

const ITEMS: { id: ArticleView; label: string }[] = [
  { id: "tldr", label: "TL;DR" },
  { id: "full", label: "Deep Research" },
];

// Breathing room between the glyphs and the bracket frame.
const PAD_X = 8;
const PAD_Y = 5;

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Record<ArticleView, HTMLSpanElement | null>>({
    tldr: null,
    full: null,
  });
  const [frame, setFrame] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [toggling, setToggling] = useState(false);
  const mountedRef = useRef(false);

  // Enable the slow color fade only while a toggle is in flight, so hover
  // stays instant.
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    setToggling(true);
    const timer = setTimeout(() => setToggling(false), 550);
    return () => clearTimeout(timer);
  }, [view]);

  useLayoutEffect(() => {
    const list = listRef.current;
    const label = labelRefs.current[view];
    if (!list || !label) return;

    const update = () => {
      const listRect = list.getBoundingClientRect();
      const rect = label.getBoundingClientRect();
      setFrame({
        left: rect.left - listRect.left - PAD_X,
        top: rect.top - listRect.top - PAD_Y,
        width: rect.width + PAD_X * 2,
        height: rect.height + PAD_Y * 2,
      });
    };

    update();
    window.addEventListener("resize", update);

    // The frame is measured from the text box, which reflows when the web
    // font swaps in (and the centered row shifts). A ResizeObserver re-measures
    // on any such layout change so the landing position self-corrects instead
    // of staying stuck on the fallback-font metrics.
    const observer = new ResizeObserver(update);
    observer.observe(list);
    observer.observe(label);

    return () => {
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, [view]);

  return (
    <div
      ref={listRef}
      className={cn("view-toggle", toggling && "is-toggling")}
      role="tablist"
      aria-label="Article view"
    >
      {frame && (
        <span
          aria-hidden
          className="view-toggle__frame"
          style={{
            transform: `translateY(${frame.top}px)`,
            height: frame.height,
          }}
        >
          {/* Both edges move via transform only so they stay composited in
              lockstep — animating `width` (a layout prop) alongside `transform`
              lets the right edge lag behind the left. */}
          <span
            className="vt-edge"
            style={{ transform: `translateX(${frame.left}px)` }}
          >
            <span className="vt-corner tl" />
            <span className="vt-corner bl" />
          </span>
          <span
            className="vt-edge"
            style={{ transform: `translateX(${frame.left + frame.width}px)` }}
          >
            <span className="vt-corner tr" />
            <span className="vt-corner br" />
          </span>
        </span>
      )}
      {ITEMS.map((item) => {
        const active = view === item.id;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.id)}
            className={cn("view-toggle__item", active && "is-active")}
          >
            <span
              ref={(el) => {
                labelRefs.current[item.id] = el;
              }}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
