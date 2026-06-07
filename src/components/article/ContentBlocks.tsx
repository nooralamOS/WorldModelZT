"use client";

import { useEffect, useRef, useState } from "react";
import type { ContentBlock, ExperimentLink } from "@/content/types";
import { ExhibitFigure } from "@/components/article/ExhibitFigure";
import { BodyText } from "@/components/typography/Prose";

type ContentBlocksProps = {
  blocks: ContentBlock[];
};

export function ContentBlocks({ blocks }: ContentBlocksProps) {
  return (
    <div className="flex flex-col gap-6">
      {blocks.map((block, index) => (
        <BlockRenderer key={`${block.type}-${index}`} block={block} />
      ))}
    </div>
  );
}

function BlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case "paragraph":
      return <BodyText>{block.text}</BodyText>;

    case "subheading":
      return (
        <h4 className="mt-2 text-lg font-semibold leading-snug tracking-[-0.01em] text-ink">
          {block.text}
        </h4>
      );

    case "exhibit":
      return (
        <ExhibitFigure
          src={block.src}
          alt={block.alt}
          caption={block.caption}
          wide={block.wide}
        />
      );

    case "list":
      if (block.ordered) {
        return (
          <ol className="list-decimal space-y-3 pl-6 text-[1.0625rem] leading-[1.75] text-ink-secondary marker:text-muted">
            {block.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        );
      }
      return (
        <ul className="list-disc space-y-3 pl-6 text-[1.0625rem] leading-[1.75] text-ink-secondary marker:text-accent/70">
          {block.items.map((item, i) => (
            <li key={i}>
              <ListItemContent text={item} />
            </li>
          ))}
        </ul>
      );

    case "quote":
      return (
        <figure className="my-2 rounded-sm bg-surface-elevated px-6 py-8 sm:px-8">
          <blockquote className="text-[1.125rem] leading-[1.8] text-ink-secondary">
            {block.text}
          </blockquote>
          {block.attribution && (
            <figcaption className="mt-4 text-sm text-muted">
              — {block.attribution}
            </figcaption>
          )}
        </figure>
      );

    case "footnote":
      return (
        <aside
          id={block.id}
          className="rounded-sm border border-line bg-surface-elevated/60 px-5 py-4 text-sm leading-relaxed text-muted"
        >
          <span className="mr-2 font-mono text-xs text-accent">Note</span>
          {block.text}
        </aside>
      );

    case "caption":
      return (
        <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">
          {block.text}
        </p>
      );

    case "table":
      return (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm leading-relaxed">
            <thead>
              <tr className="border-b border-line">
                {block.headers.map((header) => (
                  <th
                    key={header}
                    className="px-4 py-3 font-semibold text-ink align-top"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr
                  key={rowIndex}
                  className="border-b border-line/60 align-top last:border-0"
                >
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-4 py-4 text-ink-secondary"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "experiment-card":
      return <ExperimentCard {...block} />;

    default:
      return null;
  }
}

function ExperimentCard({
  number,
  prompt,
  rationale,
  links,
}: {
  number: string;
  prompt: string;
  rationale: string;
  links: ExperimentLink[];
}) {
  const [activeHref, setActiveHref] = useState<string | null>(
    () => links.find((l) => !l.disabled && l.href)?.href ?? null
  );
  const activeLink = links.find((l) => l.href === activeHref);
  const embeddableLinks = links.filter((l) => !l.disabled && l.href);

  function toggle(href: string) {
    setActiveHref(href);
  }

  return (
    <div className="rounded-[6px] border border-line px-6 py-6">
      <div className="mb-3 font-mono text-[0.625rem] font-bold uppercase tracking-[0.14em] text-muted">
        {number}
      </div>

      <div className="mb-4 overflow-hidden rounded-[6px] border border-line">
        <div className="flex items-center justify-between border-b border-line bg-surface-elevated px-4 py-2">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-muted/30" />
              <div className="h-2.5 w-2.5 rounded-full bg-muted/30" />
              <div className="h-2.5 w-2.5 rounded-full bg-muted/30" />
            </div>
            <span className="font-mono text-[0.6875rem] text-muted">
              {activeLink?.label.replace(" ↗", "")}
            </span>
          </div>
          {activeHref && (
            <a
              href={activeHref}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[0.6875rem] text-muted transition-colors hover:text-ink"
            >
              open ↗
            </a>
          )}
        </div>
        <div
          className="relative overflow-hidden"
          style={{ resize: "both", minHeight: "320px", height: "550px", minWidth: "100%" }}
        >
          {embeddableLinks.map((link) =>
            link.glb ? (
              <div
                key={link.href}
                className="absolute inset-0"
                style={{ display: activeHref === link.href ? "block" : "none" }}
              >
                <GLBViewer src={link.glb} />
              </div>
            ) : (
              <EmbeddedFrame
                key={link.href}
                src={link.embed ?? link.href!}
                title={link.label}
                visible={activeHref === link.href}
              />
            )
          )}
        </div>
      </div>

      <div className="mb-4 text-[1rem] font-[550] leading-snug tracking-[-0.01em] text-ink">
        {prompt}
      </div>
      <p className="mb-4 text-[0.9063rem] leading-[1.65] text-ink-secondary">
        {rationale}
      </p>
      <div className="flex flex-wrap gap-2">
        {links.map((link) =>
          link.disabled ? (
            <span
              key={link.label}
              className="inline-flex items-center rounded-[4px] border border-line px-3 py-[0.3125rem] text-[0.8125rem] font-medium text-muted opacity-40"
            >
              {link.label}
            </span>
          ) : (
            <button
              key={link.label}
              onClick={() => toggle(link.href!)}
              className={`inline-flex items-center rounded-[4px] border px-3 py-[0.3125rem] text-[0.8125rem] font-medium transition-colors duration-150 ${
                activeHref === link.href
                  ? "border-ink bg-surface-elevated text-ink"
                  : "border-line text-muted hover:border-ink-secondary hover:bg-surface-elevated hover:text-ink"
              }`}
            >
              {link.label}
            </button>
          )
        )}
      </div>
    </div>
  );
}

function EmbeddedFrame({
  src,
  title,
  visible,
}: {
  src: string;
  title: string;
  visible: boolean;
}) {
  const [blocked, setBlocked] = useState(false);
  const ref = useRef<HTMLIFrameElement>(null);

  function handleLoad() {
    try {
      const href = ref.current?.contentWindow?.location.href;
      // about:blank means the browser silently blocked the frame
      if (!href || href === "about:blank") setBlocked(true);
    } catch {
      // SecurityError = cross-origin content loaded successfully
    }
  }

  return (
    <div
      className="absolute inset-0"
      style={{ display: visible ? "block" : "none" }}
    >
      {blocked ? (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-surface-elevated">
          <p className="font-mono text-[0.6875rem] text-muted">
            This site blocked embedding
          </p>
          <a
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[0.6875rem] text-accent underline underline-offset-2 transition-colors hover:text-ink"
          >
            open in new tab ↗
          </a>
        </div>
      ) : (
        <iframe
          ref={ref}
          src={src}
          title={title}
          className="h-full w-full border-0 bg-surface-elevated"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock"
          onLoad={handleLoad}
        />
      )}
    </div>
  );
}

function GLBViewer({ src }: { src: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let alive = true;
    let rafId: number;

    void (async () => {
      const [THREE, { GLTFLoader }, { OrbitControls }] = await Promise.all([
        import("three"),
        import("three/addons/loaders/GLTFLoader.js"),
        import("three/addons/controls/OrbitControls.js"),
      ]);
      if (!alive) return;

      const w = canvas.clientWidth;
      const h = canvas.clientHeight;

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      renderer.shadowMap.enabled = true;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x111111);

      const camera = new THREE.PerspectiveCamera(45, w / h, 0.01, 1000);
      camera.position.set(0, 1.5, 4);

      const controls = new OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 0.5;
      controls.maxDistance = 50;

      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const sun = new THREE.DirectionalLight(0xfff4e6, 2.0);
      sun.position.set(5, 8, 5);
      sun.castShadow = true;
      scene.add(sun);
      scene.add(new THREE.HemisphereLight(0x8ec8ff, 0x2a1a0a, 0.4));

      new GLTFLoader().load(src, (gltf) => {
        if (!alive) return;
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3 / maxDim;
        gltf.scene.scale.setScalar(scale);
        gltf.scene.position.sub(center.multiplyScalar(scale));
        scene.add(gltf.scene);

        camera.position.set(0, size.y * scale * 0.5, maxDim * scale * 1.8);
        controls.target.set(0, 0, 0);
        controls.update();
      });

      const ro = new ResizeObserver(() => {
        const cw = canvas.clientWidth;
        const ch = canvas.clientHeight;
        renderer.setSize(cw, ch, false);
        camera.aspect = cw / ch;
        camera.updateProjectionMatrix();
      });
      ro.observe(canvas);

      (function loop() {
        if (!alive) return;
        rafId = requestAnimationFrame(loop);
        controls.update();
        renderer.render(scene, camera);
      })();

      return () => {
        ro.disconnect();
        renderer.dispose();
      };
    })();

    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
    };
  }, [src]);

  return <canvas ref={canvasRef} className="h-full w-full" />;
}

function ListItemContent({ text }: { text: string }) {
  const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
  if (!urlMatch) return <>{text}</>;

  const url = urlMatch[1];
  const before = text.slice(0, text.indexOf(url));
  const after = text.slice(text.indexOf(url) + url.length);

  return (
    <>
      {before}
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
      >
        {url}
      </a>
      {after}
    </>
  );
}
