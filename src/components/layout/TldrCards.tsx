"use client";

import { useEffect, useRef } from "react";

import { SectionTitle } from "@/components/typography/Prose";

// TL;DR rendered as a sequential card deck. Cards sit one after another in a
// vertical track inside a pinned viewport. Scroll drives the track upward
// (full vertical read per card), then the finished card slides left with a tilt
// while the track rises to the next. Native scroll / keyboard / trackpad unchanged.
type TldrLink = { label: string; href: string };
type TldrPoint = {
  term?: string;
  text: string;
  // Optional inline link rendered after `text` (followed by `textAfter`).
  link?: TldrLink;
  textAfter?: string;
  children?: TldrPoint[];
};
type TldrSection = {
  id: string;
  number: number;
  title: string;
  points: TldrPoint[];
};

const TLDR_SECTIONS: TldrSection[] = [
  {
    id: "tldr-section-1",
    number: 1,
    title: "What is a world model?",
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
    id: "tldr-section-2",
    number: 2,
    title: "Who's building world models and what are they being built for?",
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
    id: "tldr-section-3",
    number: 3,
    title: "Core technical bottlenecks across different approaches",
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
        text: `Solving these challenges is an open research problem. The most promising near-term direction is memory — giving models an explicit mechanism to store and retrieve past environmental states, rather than relying on context windows alone. Architectures like `,
        link: { label: "WorldMem", href: "https://arxiv.org/abs/2504.12369" },
        textAfter: ` are early demonstrations of this approach, extending coherent generation from a handful of frames to hundreds. Whether this is sufficient to close the reliability gap, particularly for robotics, remains to be seen.`,
      },
    ],
  },
];

// Recursive bullet list mirroring the source doc's hierarchy. Styling matches
// the Deep Dive article lists: disc bullets, accent markers, same body scale.
function PointList({ points, nested = false }: { points: TldrPoint[]; nested?: boolean }) {
  return (
    <ul
      className={`list-disc space-y-3 pl-6 text-[1.0625rem] leading-[1.75] text-ink-secondary marker:text-accent/70 ${
        nested ? "mt-3" : ""
      }`}
    >
      {points.map((point, i) => (
        <li key={i}>
          {point.term && <strong className="font-semibold text-ink">{point.term} </strong>}
          {point.text}
          {point.link && (
            <a
              href={point.link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
            >
              {point.link.label}
            </a>
          )}
          {point.textAfter}
          {point.children && <PointList points={point.children} nested />}
        </li>
      ))}
    </ul>
  );
}

const TOTAL = TLDR_SECTIONS.length;


export function TldrCards() {
  const deckRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const motionOk = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wideEnough = window.matchMedia("(min-width: 1024px)").matches;
    // Narrow / touch / reduced-motion: leave it as a plain vertical stack.
    if (!motionOk || !wideEnough) return;

    let alive = true;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (!alive) return;
      gsap.registerPlugin(ScrollTrigger);

      const cards = cardRefs.current.filter(Boolean) as HTMLElement[];
      if (cards.length !== TOTAL) return;
      const n = TOTAL;

      // Debug: append ?st-markers to the URL to draw each card's slide start/end.
      const showMarkers = new URLSearchParams(window.location.search).has("st-markers");

      // Cards live in NORMAL document flow, one after another — you read each one
      // top-to-bottom with the page's own scroll (no pinned window, so nothing
      // clips at a line). The only scripted motion is the exit: as a card reaches
      // its end, it slides off-frame to the LEFT with a tilt while the next card
      // (right below it) scrolls up into view. `power2.in` keeps it stationary
      // through the read, then accelerates the slide only at the very end — so it
      // reads as "scroll all the way down, THEN peel left." No fades.
      let tweens: gsap.core.Tween[] = [];

      // Refresh ONLY the deck's own card triggers. A global ScrollTrigger.refresh()
      // would also re-run the earth-hero/title timeline — and when that fires a
      // tick after a view toggle (this component mounts late), it can leave the
      // hero title's scrubbed transform short of docked, snapping it to centre.
      const refreshCards = () => tweens.forEach((t) => t.scrollTrigger?.refresh());

      const build = () => {
        tweens.forEach((t) => {
          t.scrollTrigger?.kill();
          t.kill();
        });
        tweens = [];
        gsap.set(cards, { clearProps: "transform" });

        for (let i = 0; i < n - 1; i++) {
          tweens.push(
            gsap.to(cards[i], {
              x: () => -window.innerWidth * 1.15,
              rotation: -8,
              scale: 0.9,
              ease: "power1.in",
              scrollTrigger: {
                trigger: cards[i],
                // Slide starts only once the card's bottom reaches mid-screen —
                // i.e. you've read essentially all of it — then it peels left.
                start: "bottom 50%",
                end: "bottom top", // its bottom leaves the top of the screen
                scrub: true,
                invalidateOnRefresh: true,
                // The earth-hero pin lays down a 200vh spacer that shifts every
                // card's document position. A negative priority makes our
                // triggers recompute AFTER that pin on every refresh, so they
                // never measure a pre-spacer (too-early) position.
                refreshPriority: -1,
                markers: showMarkers,
              },
            }),
          );
        }
      };

      // CRITICAL: don't build until the hero's pin-spacer exists, otherwise the
      // cards measure their position WITHOUT the 200vh offset and card 1's slide
      // fires mid-hero (~progress 0.65) — sliding it away before it's even seen,
      // and leaving a dead scroll zone in its empty slot. GSAP tags its spacer
      // `.pin-spacer`, so poll a few seconds for it, then build + refresh.
      let raf = 0;
      const buildWhenPinned = (attempts = 0) => {
        if (!alive) return;
        const pinReady = document.querySelector(".pin-spacer") !== null;
        if (pinReady || attempts > 240) {
          build();
          refreshCards();
          return;
        }
        raf = requestAnimationFrame(() => buildWhenPinned(attempts + 1));
      };
      buildWhenPinned();

      void document.fonts?.ready.then(() => {
        if (alive) refreshCards();
      });

      let resizeTimer: ReturnType<typeof setTimeout>;
      const onResize = () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (alive) refreshCards();
        }, 150);
      };
      window.addEventListener("resize", onResize);

      cleanup = () => {
        window.removeEventListener("resize", onResize);
        clearTimeout(resizeTimer);
        cancelAnimationFrame(raf);
        tweens.forEach((t) => {
          t.scrollTrigger?.kill();
          t.kill();
        });
        gsap.set(cards, { clearProps: "transform" });
      };
    })();

    return () => {
      alive = false;
      cleanup?.();
    };
  }, []);

  return (
    <div ref={deckRef} className="tldr-deck">
      {TLDR_SECTIONS.map((section, i) => (
        <section
          key={section.id}
          id={section.id}
          aria-labelledby={`${section.id}-title`}
          className="tldr-card"
          ref={(el) => {
            cardRefs.current[i] = el;
          }}
        >
          <div className="tldr-card__panel">
            <div className="tldr-card__bar" aria-hidden="true">
              <span className="tldr-card__bar-label">TL;DR</span>
              <span className="tldr-card__bar-index">
                {String(section.number).padStart(2, "0")} / {String(TOTAL).padStart(2, "0")}
              </span>
            </div>

            <div className="tldr-card__body">
              <header className="mb-8">
                <SectionTitle id={`${section.id}-title`} number={section.number}>
                  {section.title}
                </SectionTitle>
              </header>
              <PointList points={section.points} />
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}
