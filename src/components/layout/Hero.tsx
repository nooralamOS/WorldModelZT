import type { ArticleMeta } from "@/content/types";
import { DisplayTitle, Epigraph, Lead } from "@/components/typography/Prose";

type HeroProps = {
  meta: ArticleMeta;
};

export function HeroBody({ meta }: HeroProps) {
  return (
    <>
      <div className="mt-8 max-w-[42rem]">
        <Lead>{meta.subtitle}</Lead>
      </div>
      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs uppercase tracking-[0.14em] text-muted">
        <span>Research Deep-Dive</span>
        <span aria-hidden className="hidden sm:inline text-line-strong">/</span>
        <span>{meta.readingTimeMinutes} min read</span>
        <span aria-hidden className="text-line-strong">/</span>
        <span>{meta.sectionCount} sections</span>
      </div>
    </>
  );
}

export function Hero({ meta }: HeroProps) {
  return (
    <header
      className="pb-6 sm:pb-8"
      style={{ paddingTop: "var(--hero-title-top-spacing, 5.6rem)" }}
    >
      {/* Invisible layout anchor — earth-hero-title shrinks into this position */}
      <DisplayTitle
        id="article-title"
        style={{ visibility: 'hidden', pointerEvents: 'none', userSelect: 'none' }}
        aria-hidden="true"
      >
        W<span id="article-o-anchor">o</span>rld Model Deep-Dive
      </DisplayTitle>

      <div className="mt-8 max-w-[42rem]">
        <Lead>{meta.subtitle}</Lead>
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs uppercase tracking-[0.14em] text-muted">
        <span>Research Deep-Dive</span>
        <span aria-hidden className="hidden sm:inline text-line-strong">
          /
        </span>
        <span>{meta.readingTimeMinutes} min read</span>
        <span aria-hidden className="text-line-strong">
          /
        </span>
        <span>{meta.sectionCount} sections</span>
      </div>

      <div className="mt-14 max-w-article border-y border-line py-8">
        <Epigraph quote={meta.epigraph.quote} attribution={meta.epigraph.attribution} />
      </div>
    </header>
  );
}
