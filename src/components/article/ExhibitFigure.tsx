"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";

type ExhibitFigureProps = {
  src: string;
  alt: string;
  caption: string;
  wide?: boolean;
};

export function ExhibitFigure({ src, alt, caption, wide }: ExhibitFigureProps) {
  const [isOpen, setIsOpen] = useState(false);

  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [close, isOpen]);

  return (
    <>
      <figure
        className={wide ? "max-w-none" : "max-w-article"}
        data-wide={wide ? "true" : undefined}
      >
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group block w-full cursor-zoom-in overflow-hidden rounded-sm border border-line bg-white text-left"
          aria-label={`View larger: ${alt}`}
        >
          <Image
            src={src}
            alt={alt}
            width={1400}
            height={900}
            className="h-auto w-full transition-opacity group-hover:opacity-90"
            quality={90}
            priority={false}
          />
        </button>
        <figcaption className="mt-3 font-mono text-xs uppercase tracking-[0.12em] text-muted">
          {caption}
        </figcaption>
      </figure>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/45 p-6 backdrop-blur-[2px]"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={alt}
        >
          <button
            type="button"
            onClick={close}
            className="absolute right-5 top-5 rounded-sm px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] text-white/80 transition-colors hover:text-white"
            aria-label="Close image preview"
          >
            Close
          </button>

          <div
            className="relative max-h-[90vh] max-w-[min(92vw,72rem)] overflow-hidden rounded-sm border border-line/60 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <Image
              src={src}
              alt={alt}
              width={1400}
              height={900}
              className="h-auto max-h-[90vh] w-auto max-w-[min(92vw,72rem)] object-contain"
              quality={95}
            />
          </div>
        </div>
      )}
    </>
  );
}
