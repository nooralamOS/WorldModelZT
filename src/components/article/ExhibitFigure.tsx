"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ExhibitFigureProps = {
  src: string;
  alt: string;
  caption: string;
  wide?: boolean;
  zoomable?: boolean;
};

function isVideoSrc(src: string) {
  return /\.(webm|mp4|mov)(\?|$)/i.test(src);
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// Shared media markup so the inline figure and the zoomed overlay stay identical.
function Media({
  src,
  alt,
  isVideo,
  zoomed,
}: {
  src: string;
  alt: string;
  isVideo: boolean;
  zoomed?: boolean;
}) {
  const sizeClass = zoomed
    ? "block h-auto max-h-[72vh] w-auto max-w-[72vw]"
    : "h-auto w-full";

  if (isVideo) {
    return (
      <video
        src={src}
        aria-label={alt}
        className={`pointer-events-none ${sizeClass}`}
        autoPlay
        loop
        muted
        playsInline
        disablePictureInPicture
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={1400}
      height={900}
      className={sizeClass}
      quality={zoomed ? 100 : 90}
      priority={false}
    />
  );
}

export function ExhibitFigure({ src, alt, caption, wide, zoomable = false }: ExhibitFigureProps) {
  const isVideo = isVideoSrc(src);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const overlayMediaRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  // `mounted` keeps the portal in the DOM through the closing animation.
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const closingRef = useRef(false);

  // Run the FLIP transition between the inline trigger and the centered overlay.
  const playFlip = useCallback((reverse: boolean) => {
    const el = overlayMediaRef.current;
    const trigger = triggerRef.current;
    const backdrop = backdropRef.current;
    if (!el || !trigger || !backdrop) return;

    const first = trigger.getBoundingClientRect();
    const last = el.getBoundingClientRect();
    if (last.width === 0 || last.height === 0) return;

    const dx = first.left - last.left;
    const dy = first.top - last.top;
    const scale = first.width / last.width;
    const from = `translate(${dx}px, ${dy}px) scale(${scale})`;

    if (prefersReducedMotion()) {
      el.style.transition = "none";
      el.style.transform = "none";
      el.style.opacity = reverse ? "0" : "1";
      backdrop.style.opacity = reverse ? "0" : "1";
      return;
    }

    // Invert: jump to the trigger's position with no transition...
    el.style.transition = "none";
    el.style.transformOrigin = "top left";
    el.style.transform = reverse ? "none" : from;
    el.style.opacity = "1";
    // Force a reflow so the browser registers the starting state.
    void el.getBoundingClientRect();

    // ...then play to the resting state.
    requestAnimationFrame(() => {
      el.style.transition = "transform 360ms cubic-bezier(0.22, 1, 0.36, 1)";
      el.style.transform = reverse ? from : "none";
      backdrop.style.opacity = reverse ? "0" : "1";
    });
  }, []);

  // Forward animation once the overlay is in the DOM.
  useLayoutEffect(() => {
    if (open) playFlip(false);
  }, [open, playFlip]);

  const handleOpen = useCallback(() => {
    closingRef.current = false;
    setMounted(true);
    setOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setOpen(false);

    if (prefersReducedMotion()) {
      setMounted(false);
      triggerRef.current?.focus();
      return;
    }

    playFlip(true);
    const el = overlayMediaRef.current;
    const finish = () => {
      setMounted(false);
      triggerRef.current?.focus();
    };
    if (!el) {
      finish();
      return;
    }
    const onEnd = (e: TransitionEvent) => {
      if (e.propertyName !== "transform") return;
      el.removeEventListener("transitionend", onEnd);
      finish();
    };
    el.addEventListener("transitionend", onEnd);
    // Safety net if transitionend never fires.
    window.setTimeout(finish, 480);
  }, [playFlip]);

  // Lock body scroll + close on Escape while the overlay is mounted.
  useEffect(() => {
    if (!mounted) return;

    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    const { overflow, paddingRight } = document.body.style;
    document.body.style.overflow = "hidden";
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      window.removeEventListener("keydown", onKey);
    };
  }, [mounted, handleClose]);

  if (!zoomable) {
    return (
      <figure className={wide ? "max-w-none" : "max-w-article"} data-wide={wide ? "true" : undefined}>
        <div className="overflow-hidden rounded-sm">
          <Media src={src} alt={alt} isVideo={isVideo} />
        </div>
        <figcaption className="mt-3 font-mono text-xs uppercase tracking-[0.12em] text-muted">
          {caption}
        </figcaption>
      </figure>
    );
  }

  return (
    <figure className={wide ? "max-w-none" : "max-w-article"} data-wide={wide ? "true" : undefined}>
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpen}
        aria-label={`Expand exhibit: ${caption}`}
        className="block w-full cursor-pointer overflow-hidden rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Media src={src} alt={alt} isVideo={isVideo} />
      </button>

      <figcaption className="mt-3 font-mono text-xs uppercase tracking-[0.12em] text-muted">
        {caption}
      </figcaption>

      {mounted &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label={caption}
            className="fixed inset-0 z-50 flex cursor-pointer items-center justify-center p-6"
            onClick={handleClose}
          >
            <div
              ref={backdropRef}
              aria-hidden
              className="absolute inset-0 bg-surface/10"
              style={{
                opacity: 0,
                transition: "opacity 360ms ease",
                backdropFilter: "blur(6px)",
                WebkitBackdropFilter: "blur(6px)",
              }}
            />
            <div
              ref={overlayMediaRef}
              className="relative max-h-[72vh] max-w-[72vw] overflow-hidden rounded-sm shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
              style={{ willChange: "transform" }}
            >
              <Media src={src} alt={alt} isVideo={isVideo} zoomed />
            </div>
          </div>,
          document.body
        )}
    </figure>
  );
}
