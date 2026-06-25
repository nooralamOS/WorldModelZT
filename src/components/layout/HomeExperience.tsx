"use client";

import { useRef, useState, type ReactNode } from "react";
import { EarthScrollStage } from "@/components/layout/EarthScrollStage";
import { ViewToggle, type ArticleView } from "@/components/layout/ViewToggle";
import { runPixelTransition } from "@/lib/pixelTransition";

type HomeExperienceProps = {
  tldr: ReactNode;
  full: ReactNode;
};

export function HomeExperience({ tldr, full }: HomeExperienceProps) {
  const [view, setView] = useState<ArticleView>("tldr");
  const animating = useRef(false);

  const handleChange = (next: ArticleView) => {
    if (next === view || animating.current) return;

    // Blast the pixel wave out from the toggle, then swap the view beneath it.
    // The clone of the current page is captured synchronously here (before React
    // commits the new content), so the dissolve reveals the incoming page.
    const toggle = document.querySelector<HTMLElement>(".view-toggle");
    const r = toggle?.getBoundingClientRect();
    const originX = r ? r.left + r.width / 2 : window.innerWidth / 2;
    const originY = r ? r.top + r.height / 2 : 24;

    animating.current = true;
    runPixelTransition({
      originX,
      originY,
      onDone: () => {
        animating.current = false;
      },
    });
    setView(next);
  };

  return (
    <EarthScrollStage view={view} nav={<ViewToggle view={view} onChange={handleChange} />}>
      {view === "tldr" ? tldr : full}
    </EarthScrollStage>
  );
}
