"use client";

import Image from "next/image";

type ExhibitFigureProps = { src: string; alt: string; caption: string; wide?: boolean };

function isVideoSrc(src: string) {
  return /\.(webm|mp4|mov)(\?|$)/i.test(src);
}

export function ExhibitFigure({ src, alt, caption, wide }: ExhibitFigureProps) {
  const isVideo = isVideoSrc(src);

  return (
    <figure className={wide ? "max-w-none" : "max-w-article"} data-wide={wide ? "true" : undefined}>
      <div className="overflow-hidden rounded-sm border border-line bg-white">
        {isVideo ? (
          <video
            src={src}
            aria-label={alt}
            className="pointer-events-none h-auto w-full"
            autoPlay
            loop
            muted
            playsInline
            disablePictureInPicture
          />
        ) : (
          <Image
            src={src}
            alt={alt}
            width={1400}
            height={900}
            className="h-auto w-full"
            quality={90}
            priority={false}
          />
        )}
      </div>
      <figcaption className="mt-3 font-mono text-xs uppercase tracking-[0.12em] text-muted">
        {caption}
      </figcaption>
    </figure>
  );
}
