"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { DisplayTitle } from "@/components/typography/Prose";
import { MiniGlobe } from "@/components/layout/MiniGlobe";
import { usePretextClamp } from "@/lib/usePretextClamp";

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

const IconPointCloud = <MiniGlobe variant="points" spin={false} className="tldr-card__glyph" />;

const IconEarth = <MiniGlobe variant="earth" interactive className="tldr-card__glyph" />;

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
    icon: IconPointCloud,
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

const LAYOUT_TRANSITION = { duration: 0.28, ease: [0.22, 1, 0.36, 1] } as const;

const CARD_CLAMP_LINES = 4;

// Grid card. Extracted so it can call usePretextClamp — the hook measures how
// the body actually wraps at the card's live width (via pretext: canvas
// measurement + arithmetic, no reflow) so we can show a precise "+N lines"
// affordance instead of a blind CSS line-clamp.
function TldrCardButton({ card, onOpen }: { card: TldrCard; onOpen: () => void }) {
  const { ref, hiddenLines, isClamped } = usePretextClamp<HTMLParagraphElement>(
    card.body,
    CARD_CLAMP_LINES,
  );

  return (
    <motion.button
      layoutId={`tldr-card-${card.id}`}
      type="button"
      onClick={onOpen}
      transition={LAYOUT_TRANSITION}
      style={{ borderRadius: 2 }}
      className="tldr-card flex min-h-[15rem] flex-col p-6 text-left"
    >
      <div className="flex items-center gap-3">
        <span className="tldr-card__icon shrink-0 text-ink">{card.icon}</span>
        <h2 className="flex-1 text-center font-mondwest text-[1.5rem] leading-[1.15] text-ink">
          {card.title}
        </h2>
      </div>
      <p
        ref={ref}
        className="mt-4 line-clamp-4 text-sm leading-relaxed text-ink-secondary/70"
      >
        {card.body}
      </p>
      {isClamped && (
        <span className="mt-2 text-xs uppercase tracking-wide text-ink-secondary/50">
          +{hiddenLines} {hiddenLines === 1 ? "line" : "lines"}
        </span>
      )}
      {/* Corner brackets on hover — same motif as the view toggle */}
      <span aria-hidden className="tldr-card__frame">
        <span className="vt-corner tl" />
        <span className="vt-corner tr" />
        <span className="vt-corner bl" />
        <span className="vt-corner br" />
      </span>
    </motion.button>
  );
}

export function TldrView() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const active = TLDR_CARDS.find((c) => c.id === activeId) ?? null;

  useEffect(() => setMounted(true), []);

  // Esc closes the open card.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active]);

  return (
    <div id="top" className="mx-auto flex min-h-screen max-w-content flex-col justify-center px-6 pb-16 sm:px-8 lg:px-12">
      <header className="flex justify-center pb-8 sm:pb-10">
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

      <section id="intro" className="scroll-mt-28">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {TLDR_CARDS.map((card) => (
            <TldrCardButton
              key={card.id}
              card={card}
              onOpen={() => setActiveId(card.id)}
            />
          ))}
        </div>
      </section>

      {/* Expanded card — portaled to <body> so position:fixed isn't trapped by
          #article-content's GSAP transform. layoutId still morphs across the
          portal because it's the same React tree. */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {active && (
              <motion.div
                key="tldr-overlay"
                className="tldr-overlay"
                onClick={() => setActiveId(null)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
              >
                <motion.div
                  layoutId={`tldr-card-${active.id}`}
                  transition={LAYOUT_TRANSITION}
                  style={{ borderRadius: 2 }}
                  className="tldr-card tldr-card--expanded border border-line"
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-label={active.title}
                >
                  {/* Content fades in once the box has morphed — keeps the icon
                      from visibly stretching while the container scales. */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.1, duration: 0.18 } }}
                    exit={{ opacity: 0, transition: { duration: 0.1 } }}
                  >
                    <div className="flex items-center gap-4">
                      <span className="tldr-card__icon shrink-0 text-ink">{active.icon}</span>
                      <h2 className="font-mondwest text-[2.4rem] leading-[1.05] text-ink">
                        {active.title}
                      </h2>
                    </div>
                    <p className="mt-6 text-[1.0625rem] leading-[1.75] text-ink-secondary">
                      {active.body}
                    </p>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
