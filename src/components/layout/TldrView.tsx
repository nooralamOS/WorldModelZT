"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { DisplayTitle } from "@/components/typography/Prose";
import { MiniGlobe } from "@/components/layout/MiniGlobe";

// One card per major article section. Each card shows a short `lead` summary in
// the grid (ellipsised/faded) and, once opened, the full set of takeaways: a
// bulleted `points` list for the article sections (cards 1–3) or a single prose
// `body` for card 4 (Experiments), which has no source in Key-takeaways.md yet.
// Each point can carry a bold `term` lead-in (mirroring the markdown's emphasis)
// and nested `children` for the sub-bullets in the source doc. Text is verbatim
// from public/World Model - Keytakeawys.md.
type TldrPoint = { term?: string; text: string; children?: TldrPoint[] };
type TldrCard = {
  id: string;
  title: string;
  icon: ReactNode;
  // Short summary shown in the grid preview.
  lead: string;
  // Expanded view: bulleted takeaways (cards 1–3) …
  points?: TldrPoint[];
  // … or a single prose paragraph (card 4).
  body?: string;
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
    lead:
      `"World model" is an overloaded term — it gets applied to everything from video generators to planning algorithms, which creates more confusion than clarity.`,
    points: [
      {
        term: `"World model" is an overloaded term`,
        text: `— it gets applied to everything from video generators to planning algorithms, which creates more confusion than clarity. A few things worth grounding before going further:`,
      },
      {
        term: `This isn't a new idea.`,
        text: `The concept predates modern AI. We trace four distinct waves of world model research going back decades, with recurring themes around how machines build internal representations of their environment.`,
      },
      {
        term: `Our definition is specific.`,
        text: `For this deep-dive, we use "world model" to mean an action-conditioned forward dynamics model: which means given a state and an action, what happens next? This deliberately excludes video generation models like Sora or Veo — impressive as they are, they don't model the consequences of acting within a generated world.`,
      },
      {
        term: `Taxonomy is harder than it looks.`,
        text: `There's no shortage of survey papers and VC articles attempting to categorize this space. The honest answer is that neat categorizations are elusive, and they don't reliably signal model quality anyway. Rather than forcing a taxonomy, we organize the landscape by use case. The most meaningful structural difference is how state is represented: in 2D vs. 3D.`,
      },
      {
        term: `One important clarification on latent space models.`,
        text: `We don't treat these as a separate category (and intentionally left them off the taxonomy diagram). Every world model has an internal latent representation. The term "latent space model" refers to a training supervision choice, not a different model architecture: does the model compute losses on semantic outputs only (as in JEPA), or does it also compute reconstruction losses on pixels? Some models do both — for example, predicting semantic outputs at every step while computing reconstruction losses every ten steps. That's a training decision, not a fundamental architectural divide.`,
      },
    ],
  },
  {
    id: "tldr-2",
    title: "Who's building them and what for?",
    icon: IconGlobe,
    lead:
      `We're in a Cambrian explosion of world model applications. We've mapped the application, input, conditioning, and output structure of the major players in the table below (based on those that have released their world models).`,
    points: [
      {
        text: `We're in a Cambrian explosion of world model applications. We've mapped the application, input, conditioning, and output structure of the major players in the table below (based on those that have released their world models).`,
        children: [
          {
            text: `We want to point out that the underlying approach from the model companies is quite similar (input: camera, conditioning: language / action) and output as video / action. For robotics, proprioception (robots' joint angles, forces, velocities are also added as an input). Some models advertise additional output types, but these are generally straightforward extensions rather than meaningful architectural differentiators.`,
          },
          {
            text: `On the strategic side, many companies are converging on a two-horizon positioning: entertainment (gaming, film) as the near- to medium-term revenue use case, with robotics and physical AI as the medium- to long-term target.`,
          },
        ],
      },
      {
        term: `There's a spectrum in terms of tech maturity:`,
        text: ``,
        children: [
          {
            term: `Autonomous vehicles.`,
            text: `The most familiar application of world models is in AV — and historically, one of the clearest motivating use cases. The core challenge in AV is the long tail of rare but dangerous scenarios that are difficult or impossible to collect real-world data for. World models offer a path around this: simulate the edge cases rather than wait for incidents to happen. The AV setting is also well-suited to world models structurally. The action space is relatively low-dimensional (a car moves in two dimensions with a limited set of controls at any given time), and contact dynamics are simple: a single, consistent point of interaction with the world, rubber on road.`,
          },
          {
            term: `Entertainment.`,
            text: `World models are now also being used in gaming and film production. In gaming specifically, world models unlock an interesting data flywheel: companies like Moonlake are building systems that generate interactive game worlds while simultaneously capturing user keystrokes and interactions — turning gameplay itself into a source of training signal. Additionally, we also see these companies allowing end users to "vibe code" games specifically. The most common use case though is in open world exploration type of games.`,
          },
          {
            term: `Robotics.`,
            text: `Robotics is arguably the most diverse and demanding application of world models. Historically, robots were trained using traditional simulators — purpose-built environments that generate synthetic experience for the robot to learn from. World models are now emerging as an alternative to those simulators, and in some architectures, as the policy itself.`,
            children: [
              {
                text: `From 2023 – 2025, Visual Language Action models (VLAs) dominated. Built on top of foundation VLMs like Gemini or PaliGemma, VLAs layer robot action data onto a pretrained vision-language backbone.`,
                children: [
                  {
                    text: `The key advantage: as the underlying VLM improves, so does the VLA — better language and visual reasoning translates directly into better high-level planning.`,
                  },
                  {
                    text: `A VLA that can recognize a banana and understand "make coffee" can begin composing multi-step action sequences from that semantic understanding. The limitation is data hunger; VLAs struggle with actions outside their training distribution.`,
                  },
                ],
              },
              {
                text: `In 2025, World Action Models (WAMs) moved to the center of attention — catalyzed in large part by NVIDIA's DreamZero paper.`,
                children: [
                  {
                    text: `WAMs take a different bet: rather than inheriting reasoning from a language backbone, they focus on learning physics.`,
                  },
                  {
                    text: `When asked to complete a task outside their training set, WAMs are better at composing novel physical actions from first principles — and they require significantly less data to do so. The tradeoff is the inverse of VLAs: stronger on physical generalization, weaker on high-level reasoning and strategic planning.`,
                  },
                ],
              },
            ],
          },
          {
            text: `The robotics community's excitement about WAMs comes down to where the bottleneck actually is. If the hard problem is robotics data— reliably manipulating objects in a messy, contact-rich world — then it makes sense to invest in a model architecture purpose-built for that. The reasoning gap is real, but addressable: one promising direction is a hybrid architecture where a world model handles the physical execution while taking instructions from a VLM that handles planning. The two approaches could be less competitors than complements.`,
          },
        ],
      },
    ],
  },
  {
    id: "tldr-3",
    title: "Core technical bottlenecks",
    icon: IconPointCloud,
    lead:
      `World models have always carried the weight of outsized expectations. As Chris Paxton noted, they have "historically really underperformed" — action-conditioned world models in particular have struggled to produce real value.`,
    points: [
      {
        text: `World models have always carried the weight of outsized expectations. As Chris Paxton noted, they have "historically really underperformed" — action-conditioned world models in particular have struggled to produce real value.`,
      },
      {
        text: `What's different this time is a confluence of three factors: video generation models have improved dramatically, more training data is now available, and architectural advances have meaningfully raised the ceiling on what these models can do.`,
      },
      {
        text: `That said, challenges remain. Current 2D models like Genie suffer from spatiotemporal inconsistency — the generated world drifts and contradicts itself over time. 3D models like Marble struggle with dynamic content; they handle static scenes well but break down when objects move or interact. For robotics specifically, a sharper criticism is reliability: world model-based approaches don't yet match the performance consistency we see from on-robot reinforcement learning methods like RL-100 or pi-0.6*.`,
      },
      {
        text: `Solving these challenges is an open research problem. The most promising near-term direction is memory — giving models an explicit mechanism to store and retrieve past environmental states, rather than relying on context windows alone. Architectures like WorldMem are early demonstrations of this approach, extending coherent generation from a handful of frames to hundreds. Whether this is sufficient to close the reliability gap, particularly for robotics, remains to be seen.`,
      },
    ],
  },
  {
    id: "tldr-4",
    title: "Experiments across world models",
    icon: IconEarth,
    lead:
      "Three hands-on prompts run across Marble, Project Genie, Odyssey, and Moonlake — testing geometric consistency, dynamic motion, and scene density.",
    body:
      "Three hands-on prompts run across Marble, Project Genie, Odyssey, and Moonlake. The brutalist library tests geometric consistency (3D wins — objects persist when you look away; 2D models lose them). The stormy cliffside tests dynamic motion and lighting. The crowded market tests scene density and how gracefully each model degrades under load.",
  },
];

const LAYOUT_TRANSITION = { duration: 0.28, ease: [0.22, 1, 0.36, 1] } as const;

// Tuned per-card icon ↔ title spacing (index matches TLDR_CARDS order).
// `gap` is the title's marginLeft; `centerTitle` left-aligns when false.
const CARD_TITLE_TUNE = [
  { gap: 10, centerTitle: false },
  { gap: 20, centerTitle: false },
  { gap: 32, centerTitle: false },
  { gap: 18, centerTitle: false },
] as const;

// Recursive bullet list for the expanded card — renders nested `children` as
// indented sub-bullets, mirroring the source doc's hierarchy.
function PointList({ points }: { points: TldrPoint[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {points.map((point, i) => (
        <li key={i} className="relative pl-5">
          <span
            aria-hidden
            className="absolute left-0 top-[0.62em] h-[5px] w-[5px] -translate-y-1/2 rounded-full bg-ink-secondary/70"
          />
          {point.term && <strong className="font-semibold text-ink">{point.term} </strong>}
          {point.text}
          {point.children && (
            <div className="mt-3">
              <PointList points={point.children} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

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
        {card.lead}
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
          {TLDR_CARDS.map((card, i) => (
            <TldrCardButton
              key={card.id}
              card={card}
              onOpen={() => setActiveId(card.id)}
              iconGap={CARD_TITLE_TUNE[i].gap}
              centerTitle={CARD_TITLE_TUNE[i].centerTitle}
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
                  {active.points ? (
                    <motion.div
                      className="mt-6 text-[1.0625rem] leading-[1.65] text-ink-secondary"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: { delay: 0.12, duration: 0.2 } }}
                      exit={{ opacity: 0, transition: { duration: 0.08 } }}
                    >
                      <PointList points={active.points} />
                    </motion.div>
                  ) : (
                    <motion.p
                      className="mt-6 text-[1.0625rem] leading-[1.75] text-ink-secondary"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: { delay: 0.12, duration: 0.2 } }}
                      exit={{ opacity: 0, transition: { duration: 0.08 } }}
                    >
                      {active.body}
                    </motion.p>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
