"use client";

import type { TocItem } from "@/content/types";
import { useScrollSpy } from "@/hooks/useScrollSpy";
import { cn } from "@/lib/cn";

type SiteNavProps = {
  items: TocItem[];
};

export function SiteNav({ items }: SiteNavProps) {
  const majorSections = items.filter((item) => item.level === 1);
  const activeId = useScrollSpy(majorSections.map((item) => item.id));

  return (
    <nav
      aria-label="Page sections"
      className="sticky top-0 z-40 border-b border-line/80 bg-surface/90 backdrop-blur-md"
    >
      <div className="mx-auto flex h-14 max-w-content items-center justify-center overflow-x-auto px-6 scrollbar-none sm:px-8 lg:px-12">
        <ul
          className="flex items-center"
          style={{ gap: "var(--nav-item-gap, 4.3rem)" }}
        >
          {majorSections.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={activeId === item.id ? "true" : undefined}
                className={cn(
                  "block whitespace-nowrap text-[0.8125rem] leading-[1.45] transition-colors",
                  activeId === item.id
                    ? "font-medium text-ink"
                    : "font-normal text-muted hover:text-ink-secondary",
                )}
                style={{
                  paddingInline: "var(--nav-item-padding-x, 0.8rem)",
                  paddingBlock: "0.375rem",
                }}
              >
                {shortNavLabel(item.title)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function shortNavLabel(title: string): string {
  const map: Record<string, string> = {
    Introduction: "Intro",
    "What is a world model?": "Definition",
    "Who's building world models and what are they being built for?":
      "Builders",
    "Core technical bottlenecks across different approaches": "Bottlenecks",
    "Experiments across world models": "Experiments",
  };
  return map[title] ?? title;
}
