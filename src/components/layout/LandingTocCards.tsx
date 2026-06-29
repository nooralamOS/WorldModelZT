"use client";

import type { MouseEvent } from "react";

import { article } from "@/content/article";

const ROMAN = ["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x"];

// Card links jump STRAIGHT to their spot in the article, skipping the pinned
// globe intro. The targets live below a 200vh pin-spacer, so their document
// offset already accounts for it — a plain instant scroll lands correctly, and
// the native scroll event lets ScrollTrigger settle the docked end-state.
function jumpTo(event: MouseEvent<HTMLAnchorElement>, id: string) {
  const el = document.getElementById(id);
  if (!el) return; // let the browser fall back to the default hash jump
  event.preventDefault();
  // `instant` (not `auto`): the page sets scroll-behavior:smooth globally, and
  // `auto` would inherit that — smooth-scrolling thousands of px past the pinned
  // globe intro is janky. We want a clean cut straight into the article.
  el.scrollIntoView({ behavior: "instant", block: "start" });
  // Park focus on the heading for keyboard/AT users without re-scrolling.
  el.setAttribute("tabindex", "-1");
  el.focus({ preventScroll: true });
}

export function LandingTocCards() {
  const sections = article.sections;
  // Column-major to match the comp: 01/02 stack on the left, 03/04 on the right.
  const columns = [sections.slice(0, 2), sections.slice(2)];

  return (
    <div id="intro-stage" className="intro-stage">
      {/* Invisible layout anchor — the hero title docks onto this spot at scroll
          0. Same glyphs/font as the live title so the handoff metrics line up. */}
      <h1
        id="intro-title-anchor"
        className="earth-hero-title intro-title-anchor"
        aria-hidden="true"
      >
        W<span>o</span>rld Model Deep-Dive
      </h1>

      <nav id="intro-cards" className="intro-cards" aria-label="Table of contents">
        {columns.map((col, ci) => (
          <div className="intro-cards__col" key={ci}>
            {col.map((section) => {
              const twoCol = section.subsections.length > 3;
              return (
                <article className="intro-card" key={section.id}>
                  <a
                    href={`#${section.id}`}
                    className="intro-card__head"
                    onClick={(e) => jumpTo(e, section.id)}
                  >
                    {String(section.number).padStart(2, "0")} — {section.title}
                  </a>
                  <ol
                    className={`intro-card__list${twoCol ? " is-two-col" : ""}`}
                  >
                    {section.subsections.map((sub, i) => (
                      <li key={sub.id}>
                        <a href={`#${sub.id}`} onClick={(e) => jumpTo(e, sub.id)}>
                          <span className="intro-card__num">{ROMAN[i]}.</span>{" "}
                          {sub.title}
                        </a>
                      </li>
                    ))}
                  </ol>
                </article>
              );
            })}
          </div>
        ))}
      </nav>
    </div>
  );
}
