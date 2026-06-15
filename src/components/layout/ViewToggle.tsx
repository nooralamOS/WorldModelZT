"use client";

import { cn } from "@/lib/cn";

export type ArticleView = "tldr" | "full";

type ViewToggleProps = {
  view: ArticleView;
  onChange: (view: ArticleView) => void;
};

const ITEMS: { id: ArticleView; label: string }[] = [
  { id: "tldr", label: "TLDR" },
  { id: "full", label: "Full Article" },
];

export function ViewToggle({ view, onChange }: ViewToggleProps) {
  return (
    <div className="view-toggle" role="tablist" aria-label="Article view">
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
            {active && (
              <span aria-hidden className="view-toggle__frame">
                <span className="vt-corner tl" />
                <span className="vt-corner tr" />
                <span className="vt-corner bl" />
                <span className="vt-corner br" />
              </span>
            )}
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
