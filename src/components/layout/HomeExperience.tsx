"use client";

import { useState, type ReactNode } from "react";
import { EarthScrollStage } from "@/components/layout/EarthScrollStage";
import { ViewToggle, type ArticleView } from "@/components/layout/ViewToggle";

type HomeExperienceProps = {
  tldr: ReactNode;
  full: ReactNode;
};

export function HomeExperience({ tldr, full }: HomeExperienceProps) {
  const [view, setView] = useState<ArticleView>("tldr");

  return (
    <EarthScrollStage view={view} nav={<ViewToggle view={view} onChange={setView} />}>
      {view === "tldr" ? tldr : full}
    </EarthScrollStage>
  );
}
