"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const EarthScrollStage = dynamic(
  () => import("./EarthScrollStage").then((m) => m.EarthScrollStage),
  { ssr: false }
);

export function EarthScrollStageClient({
  children,
  nav,
}: {
  children: ReactNode;
  nav?: ReactNode;
}) {
  return (
    <EarthScrollStage nav={nav}>
      {children}
    </EarthScrollStage>
  );
}
