"use client";

import { useState, type ReactNode } from "react";
import { DisplayTitle } from "@/components/typography/Prose";

// Placeholder summaries — one per major article section. Bodies are filler for
// now (lifted from the article so the layout reads realistically); the full
// copy lands later. Text is ellipsised in the grid and shown in full once a
// card is opened.
type TldrCard = {
  id: string;
  title: string;
  body: string;
  icon: ReactNode;
};

const IconRing = (
  <svg viewBox="0 0 40 40" aria-hidden className="tldr-card__glyph">
    <circle cx="20" cy="20" r="13" fill="none" stroke="currentColor" strokeWidth="2" />
  </svg>
);

const IconGlobe = (
  <svg viewBox="0 0 40 40" aria-hidden className="tldr-card__glyph">
    <circle cx="20" cy="20" r="13" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <ellipse cx="20" cy="20" rx="6" ry="13" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <line x1="7" y1="20" x2="33" y2="20" stroke="currentColor" strokeWidth="1.5" />
    <line x1="9" y1="13" x2="31" y2="13" stroke="currentColor" strokeWidth="1.5" />
    <line x1="9" y1="27" x2="31" y2="27" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const IconDot = (
  <svg viewBox="0 0 40 40" aria-hidden className="tldr-card__glyph">
    <circle cx="20" cy="20" r="11" fill="#2b5bff" />
  </svg>
);

const IconEarth = (
  <svg viewBox="0 0 40 40" aria-hidden className="tldr-card__glyph">
    <defs>
      <clipPath id="tldr-earth-clip">
        <circle cx="20" cy="20" r="13" />
      </clipPath>
    </defs>
    <circle cx="20" cy="20" r="13" fill="none" stroke="currentColor" strokeWidth="1.5" />
    <g clipPath="url(#tldr-earth-clip)" stroke="currentColor" strokeWidth="1.5">
      <line x1="7" y1="14" x2="33" y2="14" />
      <line x1="7" y1="18" x2="33" y2="18" />
      <line x1="7" y1="22" x2="33" y2="22" />
      <line x1="7" y1="26" x2="33" y2="26" />
    </g>
  </svg>
);

const TLDR_CARDS: TldrCard[] = [
  {
    id: "tldr-1",
    title: "What is a world model?",
    icon: IconRing,
    body:
      "A world model is an action-conditioned forward dynamics model: given a state and an action, it predicts the next state — which excludes passive video generators like Sora. The main families are 2D generative models (frame-by-frame video) and 3D models that maintain an explicit, persistent scene representation. The distinction matters because only one of them keeps the world coherent when you stop looking.",
  },
  {
    id: "tldr-2",
    title: "Who's building them and what for?",
    icon: IconGlobe,
    body:
      "Five application areas are emerging. Film (World Labs' Marble) bets on 3D for geometric consistency across shots. Gaming (Moonlake, General Intuition) exploits the play-data flywheel. Autonomous driving (Tesla, Waymo) uses world models for closed-loop simulation. Robotics treats them as learned physics. And general-purpose agents use them to plan over imagined futures.",
  },
  {
    id: "tldr-3",
    title: "Core technical bottlenecks",
    icon: IconDot,
    body:
      "Each approach has a structural ceiling. 2D models suffer compounding rollout error (worlds drift from coherence over long horizons), high control latency inherited from video-gen foundations, and ballooning compute costs. 3D models are sharper geometrically but harder to generate and animate at scale. Neither has solved persistence, controllability, and cost at the same time.",
  },
  {
    id: "tldr-4",
    title: "Experiments across world models",
    icon: IconEarth,
    body:
      "Three hands-on prompts run across Marble, Project Genie, Odyssey, and Moonlake. The brutalist library tests geometric consistency (3D wins — objects persist when you look away; 2D models lose them). The stormy cliffside tests dynamic motion and lighting. The crowded market tests scene density and how gracefully each model degrades under load.",
  },
];

export function TldrView() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = TLDR_CARDS.find((c) => c.id === activeId) ?? null;

  return (
    <div id="top" className="mx-auto max-w-content px-6 sm:px-8 lg:px-12">
      <header
        className="flex justify-center pb-10 sm:pb-12"
        style={{ paddingTop: "var(--tldr-title-top-spacing, clamp(7rem, 16vh, 12rem))" }}
      >
        {/* Invisible layout anchor — earth-hero-title shrinks into this position.
            Kept large + centered so the title lands big and centred in TLDR. */}
        <DisplayTitle
          id="article-title"
          className="text-center"
          style={{
            visibility: "hidden",
            pointerEvents: "none",
            userSelect: "none",
            width: "fit-content",
            marginInline: "auto",
            fontSize: "clamp(3rem, 9.5vw, 8rem)",
            lineHeight: 0.95,
          }}
          aria-hidden="true"
        >
          W<span id="article-o-anchor">o</span>rld Model Deep-Dive
        </DisplayTitle>
      </header>

      <section id="intro" className="scroll-mt-28 pb-24">
        {active ? (
          <article className="mx-auto max-w-article">
            <button
              type="button"
              onClick={() => setActiveId(null)}
              className="mb-8 inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-muted transition-colors hover:text-ink-secondary"
            >
              <span aria-hidden>←</span> All summaries
            </button>
            <div className="flex items-start gap-4">
              <span className="tldr-card__icon shrink-0 text-ink">{active.icon}</span>
              <h2 className="font-mondwest text-[2.4rem] leading-[1.05] text-ink">
                {active.title}
              </h2>
            </div>
            <p className="mt-8 text-[1.0625rem] leading-[1.75] text-ink-secondary">
              {active.body}
            </p>
          </article>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TLDR_CARDS.map((card, i) => (
              <button
                key={card.id}
                type="button"
                onClick={() => setActiveId(card.id)}
                className={
                  "tldr-card flex min-h-[15rem] flex-col p-6 text-left transition-colors " +
                  (i === 0
                    ? "border border-dashed border-line-strong"
                    : "border border-line")
                }
              >
                <span className="tldr-card__icon text-ink">{card.icon}</span>
                <h2 className="mt-4 font-mondwest text-[1.5rem] leading-[1.15] text-ink">
                  {card.title}
                </h2>
                <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-ink-secondary/70">
                  {card.body}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
