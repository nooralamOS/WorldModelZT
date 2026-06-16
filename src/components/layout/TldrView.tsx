"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { DialRoot, useDialKit } from "dialkit";
import "dialkit/styles.css";
import { DisplayTitle } from "@/components/typography/Prose";
import { MiniGlobe } from "@/components/layout/MiniGlobe";

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
  <svg viewBox="6 6 28 28" aria-hidden className="tldr-card__glyph">
    <circle cx="20" cy="20" r="13" fill="none" stroke="currentColor" strokeWidth="1" />
  </svg>
);

const IconGlobe = (
  <svg viewBox="0 0 39 39" fill="none" aria-hidden className="tldr-card__glyph">
    <circle cx="19.449" cy="19.449" r="19.0711" stroke="currentColor" strokeWidth="0.755716" />
    <path d="M3.51489 19.4492C3.51499 8.84437 10.5739 0.378144 19.135 0.37793C27.6962 0.37793 34.756 8.84423 34.7561 19.4492C34.7561 30.0543 27.6963 38.5205 19.135 38.5205C10.5739 38.5203 3.51489 30.0542 3.51489 19.4492Z" stroke="currentColor" strokeWidth="0.755716" />
    <path d="M8.53369 19.4492C8.53373 14.1332 9.78597 9.33901 11.7905 5.88672C13.8007 2.42486 16.5214 0.37793 19.4487 0.37793C22.3761 0.37793 25.0968 2.42486 27.1069 5.88672C29.1115 9.33901 30.3637 14.1332 30.3638 19.4492C30.3638 24.7653 29.1115 29.5604 27.1069 33.0127C25.0968 36.4743 22.376 38.5205 19.4487 38.5205C16.5215 38.5205 13.8006 36.4743 11.7905 33.0127C9.78594 29.5604 8.53369 24.7653 8.53369 19.4492Z" stroke="currentColor" strokeWidth="0.755716" />
    <path d="M14.8079 19.4492C14.8079 14.1024 15.4029 9.27547 16.3567 5.79688C16.8343 4.05489 17.3961 2.67241 18.0042 1.73438C18.6229 0.779906 19.2258 0.37793 19.7629 0.37793C20.3001 0.378037 20.903 0.779994 21.5217 1.73438C22.1298 2.67242 22.6916 4.05495 23.1692 5.79688C24.123 9.27546 24.718 14.1024 24.718 19.4492C24.718 24.7959 24.1229 29.623 23.1692 33.1016C22.6916 34.8433 22.1297 36.226 21.5217 37.1641C20.903 38.1184 20.3001 38.5204 19.7629 38.5205C19.2258 38.5205 18.6229 38.1186 18.0042 37.1641C17.3961 36.226 16.8343 34.8434 16.3567 33.1016C15.4029 29.6229 14.8079 24.7959 14.8079 19.4492Z" stroke="currentColor" strokeWidth="0.755716" />
    <path d="M19.4492 17.3174C24.8089 17.3174 29.6543 17.5973 33.1533 18.0488C34.9055 18.2749 36.3056 18.5429 37.2598 18.834C37.7394 18.9803 38.0846 19.1258 38.3018 19.2627C38.4558 19.3598 38.5012 19.4245 38.5146 19.4482C38.5021 19.471 38.4582 19.5361 38.3018 19.6348C38.0846 19.7717 37.7394 19.9181 37.2598 20.0645C36.3056 20.3555 34.9055 20.6225 33.1533 20.8486C29.6543 21.3001 24.8089 21.581 19.4492 21.5811C14.0896 21.5811 9.24417 21.3001 5.74512 20.8486C3.99289 20.6225 2.59285 20.3555 1.63867 20.0645C1.15883 19.9181 0.813894 19.7717 0.59668 19.6348C0.438523 19.535 0.393904 19.4704 0.381836 19.4482C0.394812 19.425 0.441067 19.3608 0.59668 19.2627C0.813885 19.1258 1.15893 18.9803 1.63867 18.834C2.59285 18.5429 3.99288 18.2749 5.74512 18.0488C9.24417 17.5974 14.0896 17.3174 19.4492 17.3174Z" stroke="currentColor" strokeWidth="0.755716" />
    <path d="M19.4485 12.9258C24.6346 12.9258 29.3234 13.2059 32.7083 13.6572C34.4032 13.8832 35.7564 14.1509 36.678 14.4414C37.1413 14.5875 37.4734 14.7323 37.6819 14.8682C37.9092 15.0163 37.8929 15.087 37.8928 15.0576C37.8928 15.0276 37.9095 15.0977 37.6819 15.2461C37.4734 15.3819 37.1414 15.5277 36.678 15.6738C35.7564 15.9643 34.4032 16.231 32.7083 16.457C29.3234 16.9083 24.6346 17.1895 19.4485 17.1895C14.2625 17.1894 9.57451 16.9083 6.1897 16.457C4.49463 16.231 3.14158 15.9643 2.21997 15.6738C1.75647 15.5277 1.42457 15.382 1.21606 15.2461C0.988165 15.0976 1.00513 15.0276 1.00513 15.0576C1.00505 15.0871 0.988632 15.0164 1.21606 14.8682C1.42457 14.7323 1.75663 14.5875 2.21997 14.4414C3.14159 14.1509 4.49456 13.8832 6.1897 13.6572C9.57451 13.2059 14.2625 12.9258 19.4485 12.9258Z" stroke="currentColor" strokeWidth="0.755716" />
    <path d="M19.4495 25.9722C14.2633 25.9722 9.57458 25.692 6.1897 25.2407C4.49471 25.0147 3.14153 24.7471 2.21997 24.4565C1.75666 24.3105 1.42451 24.1656 1.21606 24.0298C0.988699 23.8816 1.00504 23.8109 1.00513 23.8403C1.00513 23.8703 0.988404 23.8003 1.21606 23.6519C1.42453 23.516 1.75659 23.3702 2.21997 23.2241C3.14152 22.9336 4.49475 22.6669 6.1897 22.4409C9.57458 21.9896 14.2633 21.7085 19.4495 21.7085C24.6355 21.7085 29.3234 21.9896 32.7083 22.4409C34.4033 22.6669 35.7564 22.9336 36.678 23.2241C37.1415 23.3702 37.4734 23.516 37.6819 23.6519C37.9098 23.8004 37.8928 23.8703 37.8928 23.8403C37.8929 23.8109 37.9093 23.8816 37.6819 24.0298C37.4734 24.1656 37.1413 24.3105 36.678 24.4565C35.7564 24.7471 34.4034 25.0147 32.7083 25.2407C29.3234 25.692 24.6355 25.9722 19.4495 25.9722Z" stroke="currentColor" strokeWidth="0.755716" />
    <path d="M19.4487 6.65186C23.7663 6.65186 27.6668 6.93221 30.48 7.38232C31.8893 7.60783 33.0087 7.87281 33.7671 8.15967C34.1484 8.3039 34.4168 8.44611 34.5825 8.57568C34.7545 8.71024 34.7554 8.78213 34.7554 8.78369C34.7552 8.78843 34.7506 8.8602 34.5825 8.9917C34.4168 9.12127 34.1484 9.26251 33.7671 9.40674C33.0086 9.69363 31.8895 9.95954 30.48 10.1851C27.6668 10.6352 23.7663 10.9155 19.4487 10.9155C15.1312 10.9155 11.2306 10.6352 8.41748 10.1851C7.00802 9.95953 5.88877 9.69363 5.13037 9.40674C4.74936 9.2626 4.48164 9.1212 4.31592 8.9917C4.14753 8.86004 4.14223 8.78837 4.14209 8.78369C4.14209 8.78213 4.14357 8.71044 4.31592 8.57568C4.48164 8.44613 4.74914 8.30388 5.13037 8.15967C5.88876 7.87279 7.0081 7.60784 8.41748 7.38232C11.2306 6.93222 15.1312 6.65186 19.4487 6.65186Z" stroke="currentColor" strokeWidth="0.755716" />
    <path d="M19.624 32.2437C15.3064 32.2437 11.406 31.9633 8.59277 31.5132C7.18341 31.2877 6.06409 31.0227 5.30566 30.7358C4.92438 30.5916 4.65595 30.4494 4.49023 30.3198C4.31828 30.1853 4.31738 30.1134 4.31738 30.1118C4.31753 30.1071 4.32211 30.0353 4.49023 29.9038C4.65595 29.7742 4.92438 29.633 5.30566 29.4888C6.0641 29.2019 7.18327 28.936 8.59277 28.7104C11.406 28.2603 15.3064 27.98 19.624 27.98C23.9416 27.98 27.8421 28.2603 30.6553 28.7104C32.0647 28.936 33.184 29.2019 33.9424 29.4888C34.3234 29.6329 34.5911 29.7743 34.7568 29.9038C34.9252 30.0355 34.9305 30.1071 34.9307 30.1118C34.9307 30.1134 34.9292 30.1851 34.7568 30.3198C34.5911 30.4494 34.3236 30.5916 33.9424 30.7358C33.184 31.0227 32.0647 31.2877 30.6553 31.5132C27.8421 31.9633 23.9416 32.2436 19.624 32.2437Z" stroke="currentColor" strokeWidth="0.755716" />
    <path d="M19.4492 2.88721C22.3843 2.88722 25.035 3.02759 26.9463 3.25244C27.9045 3.36517 28.6629 3.49776 29.1748 3.64014C29.3282 3.68281 29.4515 3.72527 29.5479 3.76416C29.4515 3.80305 29.3282 3.84552 29.1748 3.88818C28.6629 4.03055 27.9045 4.16315 26.9463 4.27588C25.035 4.50073 22.3843 4.6411 19.4492 4.64111C16.514 4.64111 13.8625 4.50074 11.9512 4.27588C10.993 4.16315 10.2345 4.03056 9.72266 3.88818C9.56879 3.84538 9.44514 3.80315 9.34863 3.76416C9.44514 3.72516 9.56877 3.68294 9.72266 3.64014C10.2345 3.49776 10.993 3.36517 11.9512 3.25244C13.8625 3.02758 16.514 2.88721 19.4492 2.88721Z" stroke="currentColor" strokeWidth="0.755716" />
    <path d="M19.7634 36.0063C16.8283 36.0063 14.1776 35.866 12.2664 35.6411C11.3081 35.5284 10.5497 35.3958 10.0378 35.2534C9.88442 35.2107 9.76118 35.1683 9.66479 35.1294C9.76117 35.0905 9.88446 35.048 10.0378 35.0054C10.5497 34.863 11.3082 34.7304 12.2664 34.6177C14.1776 34.3928 16.8284 34.2525 19.7634 34.2524C22.6987 34.2524 25.3501 34.3928 27.2615 34.6177C28.2197 34.7304 28.9781 34.863 29.49 35.0054C29.6439 35.0482 29.7675 35.0904 29.864 35.1294C29.7675 35.1684 29.6439 35.2106 29.49 35.2534C28.9781 35.3958 28.2197 35.5284 27.2615 35.6411C25.3501 35.866 22.6987 36.0063 19.7634 36.0063Z" stroke="currentColor" strokeWidth="0.755716" />
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

// Folder label for each card's dial controls — stable so the config and the
// per-card lookup stay in sync.
const cardDialKey = (card: TldrCard, i: number) => `${i + 1} · ${card.title}`;

// Grid card. The body is truncated with CSS line-clamp.
function TldrCardButton({
  card,
  onOpen,
  iconGap,
  centerTitle,
}: {
  card: TldrCard;
  onOpen: () => void;
  iconGap: number;
  centerTitle: boolean;
}) {
  return (
    <motion.button
      layoutId={`tldr-card-${card.id}`}
      type="button"
      onClick={onOpen}
      transition={LAYOUT_TRANSITION}
      style={{ borderRadius: 2 }}
      className="tldr-card flex min-h-[12rem] flex-col p-6 text-left"
    >
      <div className="flex items-center">
        <motion.span
          layoutId={`tldr-icon-${card.id}`}
          transition={LAYOUT_TRANSITION}
          className="tldr-card__icon shrink-0 text-ink"
        >
          {card.icon}
        </motion.span>
        <motion.h2
          layoutId={`tldr-title-${card.id}`}
          transition={LAYOUT_TRANSITION}
          // marginLeft (not flex gap) so it can go negative and pull the title
          // in tight to icons that carry their own whitespace (e.g. MiniGlobe).
          style={{ marginLeft: `${iconGap}px` }}
          className={`flex-1 font-mondwest text-[1.5rem] leading-[1.15] text-ink ${
            centerTitle ? "text-center" : "text-left"
          }`}
        >
          {card.title}
        </motion.h2>
      </div>
      <p className="tldr-card__body-fade mt-4 min-h-0 flex-1 overflow-hidden text-sm leading-relaxed text-ink-secondary/70">
        {card.body}
      </p>
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

  // Live tuning for the icon ↔ title spacing — one folder per card so each can
  // be adjusted independently. `gap` is the title's marginLeft, so it can go
  // NEGATIVE to pull the title in tight (handy for cards 3 & 4, whose MiniGlobe
  // icons carry their own whitespace). `centerTitle` toggles centering the
  // title in the leftover space vs. left-aligning it next to the icon. Bake the
  // values you settle on back into the markup once you're happy.
  const dial = useDialKit(
    "TLDR card titles",
    Object.fromEntries(
      TLDR_CARDS.map((card, i) => [
        cardDialKey(card, i),
        { gap: [8, -48, 48], centerTitle: true },
      ]),
    ),
  ) as Record<string, { gap: number; centerTitle: boolean }>;

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
      <header className="flex justify-center pb-16 sm:pb-24">
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
          {TLDR_CARDS.map((card, i) => {
            const tune = dial[cardDialKey(card, i)];
            return (
              <TldrCardButton
                key={card.id}
                card={card}
                onOpen={() => setActiveId(card.id)}
                iconGap={tune?.gap ?? 8}
                centerTitle={tune?.centerTitle ?? true}
              />
            );
          })}
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
                  {/* Icon + title are shared-layout elements (their own
                      layoutId), so they morph continuously from the grid card —
                      no fade, no empty box mid-transition. Only the body, whose
                      length genuinely changes, fades in. */}
                  <div className="flex items-center gap-3">
                    <motion.span
                      layoutId={`tldr-icon-${active.id}`}
                      transition={LAYOUT_TRANSITION}
                      className="tldr-card__icon shrink-0 text-ink"
                    >
                      {active.icon}
                    </motion.span>
                    <motion.h2
                      layoutId={`tldr-title-${active.id}`}
                      transition={LAYOUT_TRANSITION}
                      className="font-mondwest text-[2.4rem] leading-[1.05] text-ink"
                    >
                      {active.title}
                    </motion.h2>
                  </div>
                  <motion.p
                    className="mt-6 text-[1.0625rem] leading-[1.75] text-ink-secondary"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.12, duration: 0.2 } }}
                    exit={{ opacity: 0, transition: { duration: 0.08 } }}
                  >
                    {active.body}
                  </motion.p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}

      <DialRoot position="top-right" />
    </div>
  );
}
