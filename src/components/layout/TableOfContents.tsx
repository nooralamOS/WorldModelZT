"use client";

import { useEffect, useMemo, useState } from "react";
import type { TocItem } from "@/content/types";
import { useScrollSpy } from "@/hooks/useScrollSpy";
import { cn } from "@/lib/cn";

type TableOfContentsProps = {
  items: TocItem[];
};

function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 12 12"
      width="10"
      height="10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="2.75 4.75 6 8 9.25 4.75" />
    </svg>
  );
}

type TocSectionGroup = {
  section: TocItem; // level 1
  subheadings: TocItem[]; // level 2
};

function groupTocItems(items: TocItem[]): TocSectionGroup[] {
  const groups: TocSectionGroup[] = [];
  let current: TocSectionGroup | null = null;

  for (const item of items) {
    if (item.level === 1) {
      current = { section: item, subheadings: [] };
      groups.push(current);
      continue;
    }

    if (item.level === 2) {
      // If content is malformed (subheading before a section), ignore it.
      if (current) current.subheadings.push(item);
    }
  }

  return groups;
}

function getActiveSectionId(activeId: string, groups: TocSectionGroup[]): string {
  for (const group of groups) {
    if (group.section.id === activeId) return group.section.id;
    if (group.subheadings.some((s) => s.id === activeId)) return group.section.id;
  }
  return groups[0]?.section.id ?? "";
}

export function TableOfContents({ items }: TableOfContentsProps) {
  const ids = useMemo(() => items.map((item) => item.id), [items]);
  const activeId = useScrollSpy(ids);
  const groups = useMemo(() => groupTocItems(items), [items]);
  const activeSectionId = useMemo(
    () => getActiveSectionId(activeId, groups),
    [activeId, groups],
  );

  const [mobileOpen, setMobileOpen] = useState(false);
  const [openSectionId, setOpenSectionId] = useState<string>(() => {
    return groups[0]?.section.id ?? "";
  });

  useEffect(() => {
    if (!activeSectionId) return;
    setOpenSectionId(activeSectionId);
  }, [activeSectionId]);

  return (
    <>
      <div className="mb-8 min-[1060px]:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          className="flex w-full items-center justify-between rounded-sm border border-line bg-surface-elevated px-4 py-3 text-sm font-medium text-ink"
        >
          <span>Table of contents</span>
          <span
            aria-hidden
            className={cn(
              "text-muted transition-transform",
              mobileOpen && "rotate-180",
            )}
          >
            ▾
          </span>
        </button>
        {mobileOpen && (
          <div className="mt-3 max-h-[50vh] overflow-y-auto rounded-sm border border-line bg-surface-elevated px-4 py-4">
            <ul className="flex flex-col gap-1">
              {groups.map((group) => {
                const isOpen = openSectionId === group.section.id;
                const isSectionActive = activeSectionId === group.section.id;

                return (
                  <li key={group.section.id} className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <a
                        href={`#${group.section.id}`}
                        onClick={() => setMobileOpen(false)}
                        aria-current={
                          activeId === group.section.id ? "true" : undefined
                        }
                        className={cn(
                          "flex-1 rounded-sm py-1.5 text-sm font-medium leading-snug transition-colors",
                          isSectionActive
                            ? "text-ink"
                            : "text-muted hover:text-ink",
                        )}
                      >
                        {group.section.sectionNumber != null && (
                          <span className="mr-1.5 font-mono text-xs tabular-nums opacity-70">
                            {String(group.section.sectionNumber).padStart(
                              2,
                              "0",
                            )}
                          </span>
                        )}
                        {group.section.title}
                      </a>
                      {group.subheadings.length > 0 && (
                        <button
                          type="button"
                          aria-label={
                            isOpen
                              ? "Collapse section subheadings"
                              : "Expand section subheadings"
                          }
                          aria-expanded={isOpen}
                          onClick={() =>
                            setOpenSectionId((prev) =>
                              prev === group.section.id ? "" : group.section.id,
                            )
                          }
                          className={cn(
                            "toc-chevron",
                            isOpen && "is-open",
                          )}
                        >
                          <ChevronIcon />
                        </button>
                      )}
                    </div>

                    {isOpen && group.subheadings.length > 0 && (
                      <ul className="flex flex-col gap-0.5 pl-4">
                        {group.subheadings.map((sub) => (
                          <li key={sub.id}>
                            <a
                              href={`#${sub.id}`}
                              onClick={() => setMobileOpen(false)}
                              aria-current={
                                activeId === sub.id ? "true" : undefined
                              }
                              className={cn(
                                "block rounded-sm py-1 text-[0.8125rem] leading-snug transition-colors",
                                activeId === sub.id
                                  ? "text-accent"
                                  : "text-muted hover:text-ink",
                              )}
                            >
                              {sub.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <aside className="toc-sidebar" aria-label="Table of contents">
        <div className="toc-heading">Contents</div>
        <nav className="toc-nav">
          {groups.map((group, index) => {
            const needsGap = index !== 0;
            const isOpen = openSectionId === group.section.id;
            const isActiveSection = activeSectionId === group.section.id;
            const hasSubs = group.subheadings.length > 0;

            return (
              <div key={group.section.id}>
                {needsGap && <div className="toc-gap"></div>}

                <div className="toc-sectionRow">
                  <a
                    href={`#${group.section.id}`}
                    className={cn(
                      "toc-link",
                      isActiveSection && "is-active",
                    )}
                  >
                    {group.section.sectionNumber != null && (
                      <span>
                        {String(group.section.sectionNumber).padStart(2, "0")} —{" "}
                      </span>
                    )}
                    {group.section.title}
                  </a>

                  {hasSubs && (
                    <button
                      type="button"
                      className={cn("toc-chevron", isOpen && "is-open")}
                      aria-label={
                        isOpen
                          ? "Collapse section subheadings"
                          : "Expand section subheadings"
                      }
                      aria-expanded={isOpen}
                      onClick={() =>
                        setOpenSectionId((prev) =>
                          prev === group.section.id ? "" : group.section.id,
                        )
                      }
                    >
                      <ChevronIcon />
                    </button>
                  )}
                </div>

                {isOpen && hasSubs && (
                  <div className="toc-subList" role="group">
                    {group.subheadings.map((sub) => {
                      const isActive = activeId === sub.id;
                      return (
                        <a
                          key={sub.id}
                          href={`#${sub.id}`}
                          className={cn("toc-link", "toc-sub", isActive && "is-active")}
                        >
                          {sub.title}
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
