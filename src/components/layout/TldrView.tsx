import { DisplayTitle } from "@/components/typography/Prose";
import { TldrCards } from "@/components/layout/TldrCards";

// TL;DR view. The header below is an invisible layout anchor only — the globe-hero
// title shrinks into this position (EarthScrollStage measures #article-title /
// #article-o-anchor), so it must stay big + centred. The actual takeaways render
// as a horizontally-handing-off card deck (see TldrCards).
export function TldrView() {
  return (
    <div id="top">
      <header className="mx-auto flex max-w-content justify-center px-6 pb-4 pt-2 sm:px-8 sm:pb-6 lg:px-12">
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

      <TldrCards />
    </div>
  );
}
