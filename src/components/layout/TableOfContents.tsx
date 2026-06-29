"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type { TocItem } from "@/content/types";
import { useScrollSpy } from "@/hooks/useScrollSpy";
import { cn } from "@/lib/cn";

type TableOfContentsProps = {
  items: TocItem[];
};

// Pixel-art down chevron (mirrors public/icons/down-chevron.svg). Uses
// `currentColor` instead of the baked #B1BCFF fill so the .toc-chevron color
// rules drive its hover / idle states like the old chevron did.
function ChevronIcon() {
  return (
    <svg
      viewBox="0 0 814 489"
      width="11 "
      height="5"
      fill="currentColor"
      aria-hidden="true"
    >
      <rect width="162.8" height="162.8" />
      <rect x="162.801" y="162.801" width="162.8" height="162.8" />
      <rect x="325.601" y="325.602" width="162.8" height="162.8" />
      <rect x="488.401" y="162.801" width="162.8" height="162.8" />
      <rect x="651.201" width="162.8" height="162.8" />
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

function TocAnimatedSubList({
  isOpen,
  children,
}: {
  isOpen: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("toc-subList-wrap", isOpen && "is-open")}
      role="group"
      aria-hidden={!isOpen}
    >
      <div className="toc-subList-inner">
        <div className="toc-subList">{children}</div>
      </div>
    </div>
  );
}

type TocIndicatorStyle = {
  top: number;
  height: number;
  visible: boolean;
};

function useTocIndicator(
  navRef: RefObject<HTMLElement | null>,
  activeId: string,
  openSectionId: string,
  groupCount: number,
) {
  const [indicator, setIndicator] = useState<TocIndicatorStyle>({
    top: 0,
    height: 0,
    visible: false,
  });

  const updateIndicator = useCallback(() => {
    const nav = navRef.current;
    if (!nav) return;

    let target = nav.querySelector<HTMLElement>(".toc-link.is-active");
    if (!target) {
      setIndicator((prev) =>
        prev.visible ? { ...prev, visible: false } : prev,
      );
      return;
    }

    // When a section is collapsed, the active sub is hidden — anchor the
    // indicator on the parent section row so it slides up/down with it.
    const closedSubList = target.closest<HTMLElement>(
      ".toc-subList-wrap:not(.is-open)",
    );
    if (closedSubList) {
      const sectionRow = closedSubList.previousElementSibling;
      if (sectionRow?.classList.contains("toc-sectionRow")) {
        target =
          sectionRow.querySelector<HTMLElement>(".toc-link") ?? target;
      }
    }

    const navRect = nav.getBoundingClientRect();
    const linkRect = target.getBoundingClientRect();
    setIndicator({
      top: linkRect.top - navRect.top + nav.scrollTop,
      height: linkRect.height,
      visible: true,
    });
  }, [navRef]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator, activeId, openSectionId, groupCount]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;

    const ro = new ResizeObserver(updateIndicator);
    ro.observe(nav);
    nav.querySelectorAll(".toc-link, .toc-subList-wrap").forEach((el) =>
      ro.observe(el),
    );

    const onTransitionEnd = (e: Event) => {
      const te = e as TransitionEvent;
      if (
        te.propertyName === "grid-template-rows" ||
        te.propertyName === "opacity"
      ) {
        updateIndicator();
      }
    };

    nav.querySelectorAll(".toc-subList-wrap, .toc-subList-inner").forEach(
      (el) => el.addEventListener("transitionend", onTransitionEnd),
    );

    const sidebar = nav.closest(".toc-sidebar");
    sidebar?.addEventListener("scroll", updateIndicator, { passive: true });
    window.addEventListener("resize", updateIndicator, { passive: true });

    return () => {
      ro.disconnect();
      nav
        .querySelectorAll(".toc-subList-wrap, .toc-subList-inner")
        .forEach((el) =>
          el.removeEventListener("transitionend", onTransitionEnd),
        );
      sidebar?.removeEventListener("scroll", updateIndicator);
      window.removeEventListener("resize", updateIndicator);
    };
  }, [navRef, updateIndicator, openSectionId, groupCount]);

  return indicator;
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
  const [navTargetId, setNavTargetId] = useState<string | null>(null);

  const effectiveActiveId = navTargetId ?? activeId;
  const effectiveSectionId = useMemo(
    () => getActiveSectionId(effectiveActiveId, groups),
    [effectiveActiveId, groups],
  );

  const navRef = useRef<HTMLElement>(null);
  const indicator = useTocIndicator(
    navRef,
    effectiveActiveId,
    openSectionId,
    groups.length,
  );

  const handleNavClick = useCallback(
    (id: string) => {
      setNavTargetId(id);
      const sectionId = getActiveSectionId(id, groups);
      if (sectionId) setOpenSectionId(sectionId);
    },
    [groups],
  );

  useEffect(() => {
    if (navTargetId) {
      if (activeId === navTargetId) setNavTargetId(null);
      return;
    }
    if (!activeSectionId) return;
    setOpenSectionId(activeSectionId);
  }, [activeId, activeSectionId, navTargetId]);

  return (
    <>
      <div
        className="mb-8 min-[1060px]:hidden"
        style={{ fontFamily: "var(--font-neuebit)" }}
      >
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          aria-expanded={mobileOpen}
          className="flex w-full items-center justify-between rounded-sm border border-line bg-surface-elevated px-4 py-3 text-base font-medium text-ink"
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
                const isSectionActive = effectiveSectionId === group.section.id;

                return (
                  <li key={group.section.id} className="flex flex-col gap-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <a
                        href={`#${group.section.id}`}
                        onClick={() => {
                          handleNavClick(group.section.id);
                          setMobileOpen(false);
                        }}
                        aria-current={
                          effectiveActiveId === group.section.id
                            ? "true"
                            : undefined
                        }
                        className={cn(
                          "flex-1 rounded-sm py-1.5 text-base font-normal leading-snug transition-colors",
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

                    {group.subheadings.length > 0 && (
                      <TocAnimatedSubList isOpen={isOpen}>
                        {group.subheadings.map((sub) => (
                          <a
                            key={sub.id}
                            href={`#${sub.id}`}
                            onClick={() => {
                              handleNavClick(sub.id);
                              setMobileOpen(false);
                            }}
                            tabIndex={isOpen ? undefined : -1}
                            aria-current={
                              effectiveActiveId === sub.id ? "true" : undefined
                            }
                            className={cn(
                              "block rounded-sm py-1 pl-4 text-[0.9375rem] leading-snug transition-colors",
                              effectiveActiveId === sub.id
                                ? "font-medium text-ink"
                                : "text-muted hover:text-ink",
                            )}
                          >
                            {sub.title}
                          </a>
                        ))}
                      </TocAnimatedSubList>
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
        <nav ref={navRef} className="toc-nav">
          <span
            className={cn("toc-indicator", indicator.visible && "is-visible")}
            style={{
              transform: `translateY(${indicator.top}px)`,
              height: indicator.height,
            }}
            aria-hidden="true"
          />
          {groups.map((group, index) => {
            const needsGap = index !== 0;
            const isOpen = openSectionId === group.section.id;
            const isInSection = effectiveSectionId === group.section.id;
            const isSectionExact = effectiveActiveId === group.section.id;
            const hasSubs = group.subheadings.length > 0;

            return (
              <div key={group.section.id}>
                {needsGap && <div className="toc-gap"></div>}

                <div className="toc-sectionRow">
                  <a
                    href={`#${group.section.id}`}
                    onClick={() => handleNavClick(group.section.id)}
                    className={cn(
                      "toc-link",
                      isInSection && "is-section-current",
                      isSectionExact && "is-active",
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

                {hasSubs && (
                  <TocAnimatedSubList isOpen={isOpen}>
                    {group.subheadings.map((sub) => {
                      const isSubActive = effectiveActiveId === sub.id;
                      return (
                        <a
                          key={sub.id}
                          href={`#${sub.id}`}
                          onClick={() => handleNavClick(sub.id)}
                          tabIndex={isOpen ? undefined : -1}
                          className={cn(
                            "toc-link",
                            "toc-sub",
                            isSubActive && "is-active",
                          )}
                        >
                          {sub.title}
                        </a>
                      );
                    })}
                  </TocAnimatedSubList>
                )}
              </div>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
