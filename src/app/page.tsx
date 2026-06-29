import { EarthScrollStage } from "@/components/layout/EarthScrollStage";
import { FullArticleView } from "@/components/layout/FullArticleView";

export default function HomePage() {
  return (
    <div
      style={{
        "--max-width-content": "90rem",
        "--max-width-article": "46rem",
        "--hero-title-top-spacing": "5.6rem",
        "--nav-item-gap": "4.3rem",
        "--nav-item-padding-x": "0.8rem",
      } as React.CSSProperties}
    >
      <EarthScrollStage>
        <FullArticleView />
      </EarthScrollStage>
    </div>
  );
}
