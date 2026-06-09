"use client";

import React, { useEffect, useRef, useState } from "react";
import type { CompetitiveLandscapeEntry, ContentBlock, ExperimentLink } from "@/content/types";
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

    case "competitive-landscape":
      return <CompetitiveLandscapeTable entries={block.entries} variant={block.variant ?? "cards"} label={block.label} />;

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
            link.spz ? (
              activeHref === link.href ? (
                <div key={link.href} className="absolute inset-0">
                  <SPZViewer src={link.spz} />
                </div>
              ) : null
            ) : link.glb ? (
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

      {activeLink?.hint && (
        <p className="mb-4 font-mono text-[0.75rem] text-muted">
          {activeLink.hint}
        </p>
      )}

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

function SPZViewer({ src }: { src: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let alive = true;
    let rafId: number;
    let cleanup: (() => void) | undefined;

    void (async () => {
      const [THREE, { SparkRenderer, SplatMesh }, { OrbitControls }] =
        await Promise.all([
          import("three"),
          import("@sparkjsdev/spark"),
          import("three/addons/controls/OrbitControls.js"),
        ]);
      if (!alive) return;

      // Wait until the tab panel has real layout dimensions.
      let w = canvas.clientWidth;
      let h = canvas.clientHeight;
      for (let i = 0; i < 40 && (w < 2 || h < 2); i++) {
        await new Promise((r) => requestAnimationFrame(r));
        w = canvas.clientWidth;
        h = canvas.clientHeight;
      }
      if (!alive || w < 2 || h < 2) return;

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(w, h, false);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x111111);

      const camera = new THREE.PerspectiveCamera(60, w / h, 0.01, 1000);
      const controls = new OrbitControls(camera, canvas);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 0.1;
      controls.maxDistance = 500;

      const spark = new SparkRenderer({ renderer });
      scene.add(spark);

      const pivot = new THREE.Group();
      scene.add(pivot);

      const splat = new SplatMesh({ url: encodeURI(src) });
      // Blender exports Z-up; rotate to Three.js Y-up
      splat.rotation.x = -Math.PI / 2;
      pivot.add(splat);

      await splat.initialized;
      if (!alive) return;

      pivot.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(pivot);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 0.1);

      pivot.position.copy(center).negate();
      controls.target.set(0, 0, 0);
      camera.position.set(0, maxDim * 0.2, maxDim * 1.6);
      controls.update();

      const ro = new ResizeObserver(() => {
        const cw = canvas.clientWidth;
        const ch = canvas.clientHeight;
        if (cw < 2 || ch < 2) return;
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

      cleanup = () => {
        ro.disconnect();
        controls.dispose();
        splat.dispose();
        renderer.dispose();
      };
    })();

    return () => {
      alive = false;
      cancelAnimationFrame(rafId);
      cleanup?.();
    };
  }, [src]);

  return <canvas ref={canvasRef} className="h-full w-full" />;
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

      new GLTFLoader().load(src, (gltf) => {
        if (!alive) return;

        // Add without moving geometry — keeps light positions relative to meshes intact.
        scene.add(gltf.scene);

        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 0.1);

        // Orbit around the actual scene center.
        controls.target.copy(center);

        // Stand outside the scene looking at its center.
        camera.position.set(
          center.x,
          center.y + size.y * 0.2,
          center.z + maxDim * 1.5,
        );
        camera.near = maxDim * 0.001;
        camera.far = maxDim * 20;
        camera.updateProjectionMatrix();
        controls.minDistance = 0;
        controls.maxDistance = maxDim * 8;
        controls.update();

        let hasFileLights = false;
        gltf.scene.traverse((obj) => {
          if ((obj as { isLight?: boolean }).isLight) hasFileLights = true;
        });
        if (!hasFileLights) {
          scene.add(new THREE.AmbientLight(0xffffff, 0.5));
          const dir = new THREE.DirectionalLight(0xfff4e0, 2);
          dir.position.set(1, 2, 2);
          scene.add(dir);
        }
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

const COMPETITIVE_CATEGORIES = [
  "Generative Latent Simulation",
  "Generative 3D Models",
  "Generative 2D Models",
  "JEPA",
  "Robotics",
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  "Generative Latent Simulation": "#a78bfa",
  "Generative 3D Models": "#60a5fa",
  "Generative 2D Models": "#34d399",
  "JEPA": "#fbbf24",
  "Robotics": "#fb923c",
};

const STATE_SPACE_COLORS: Record<string, string> = {
  "2D": "#34d399",
  "3D": "#60a5fa",
  "Latent": "#a78bfa",
  "Mixed": "#94a3b8",
};

function getStateSpaceLabel(s?: string): string | null {
  if (!s) return null;
  if (s.includes("2D") && s.includes("3D")) return "Mixed";
  if (s.includes("2D")) return "2D";
  if (s.includes("3D")) return "3D";
  return "Latent";
}

const DOT_ROWS: { label: string; derive: (e: CompetitiveLandscapeEntry) => boolean }[] = [
  { label: "Real-time", derive: (e) => !!(e.latency?.match(/real.?time/i)) },
  { label: "Gaming", derive: (e) => !!(e.gtm?.match(/gam/i)) },
  { label: "Robotics", derive: (e) => !!(e.gtm?.match(/robot/i)) },
  { label: "Creative / Media", derive: (e) => !!(e.gtm?.match(/creative|media/i)) },
  { label: "Auto. Vehicles", derive: (e) => !!(e.gtm?.match(/vehicle|AV|autono/i)) },
  { label: "Healthcare", derive: (e) => !!(e.gtm?.match(/health/i)) },
];

function PositioningMap({ entries }: { entries: CompetitiveLandscapeEntry[] }) {
  return (
    <div className="relative w-full overflow-hidden rounded-sm border border-line bg-surface-elevated" style={{ aspectRatio: "16/9" }}>
      {/* Axis dividers */}
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-line/40" />
      <div className="absolute top-1/2 left-0 right-0 h-px bg-line/40" />

      {/* Quadrant labels */}
      <span className="absolute left-3 top-3 font-mono text-[0.5625rem] uppercase tracking-[0.1em] text-muted/60">3D · Creative</span>
      <span className="absolute right-3 top-3 font-mono text-[0.5625rem] uppercase tracking-[0.1em] text-muted/60 text-right">3D · Industrial</span>
      <span className="absolute left-3 bottom-3 font-mono text-[0.5625rem] uppercase tracking-[0.1em] text-muted/60">2D · Creative</span>
      <span className="absolute right-3 bottom-3 font-mono text-[0.5625rem] uppercase tracking-[0.1em] text-muted/60 text-right">2D · Robotics</span>

      {/* Axis labels */}
      <span className="absolute bottom-[calc(50%-1.25rem)] left-3 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-muted/40">← Entertainment</span>
      <span className="absolute bottom-[calc(50%-1.25rem)] right-3 font-mono text-[0.5rem] uppercase tracking-[0.1em] text-muted/40 text-right">Robotics →</span>
      <span className="absolute top-3 left-[calc(50%+0.5rem)] font-mono text-[0.5rem] uppercase tracking-[0.1em] text-muted/40">3D ↑</span>
      <span className="absolute bottom-3 left-[calc(50%+0.5rem)] font-mono text-[0.5rem] uppercase tracking-[0.1em] text-muted/40">↓ 2D</span>

      {/* Company dots */}
      {entries.map((company) => {
        const x = company.mapX ?? 50;
        const y = 100 - (company.mapY ?? 50);
        const color = CATEGORY_COLORS[company.category] ?? "#94a3b8";
        const labelLeft = x > 72;
        return (
          <div
            key={company.name}
            className="absolute flex items-center gap-1.5"
            style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%, -50%)" }}
          >
            <div
              className="h-2 w-2 flex-shrink-0 rounded-full"
              style={{ background: color, boxShadow: `0 0 6px ${color}60` }}
            />
            <span
              className="whitespace-nowrap font-mono text-[0.5625rem] text-ink-secondary"
              style={labelLeft ? { order: -1, textAlign: "right" } : undefined}
            >
              {company.name}
            </span>
          </div>
        );
      })}

      {/* Legend */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-x-4 gap-y-1">
        {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
          <div key={cat} className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
            <span className="font-mono text-[0.5rem] uppercase tracking-[0.08em] text-muted/60">{cat}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DotMatrix({ entries }: { entries: CompetitiveLandscapeEntry[] }) {
  const categories = COMPETITIVE_CATEGORIES.map((cat) => ({
    name: cat,
    companies: entries.filter((e) => e.category === cat),
  })).filter((c) => c.companies.length > 0);

  const allCompanies = categories.flatMap((c) => c.companies);

  return (
    <div className="overflow-x-auto rounded-sm border border-line">
      <table
        className="border-collapse text-center text-[0.8125rem]"
        style={{ minWidth: `${140 + allCompanies.length * 52}px` }}
      >
        <thead>
          {/* Category headers */}
          <tr>
            <th className="sticky left-0 z-20 w-36 border-b border-line bg-surface" />
            {categories.map((cat) => (
              <th
                key={cat.name}
                colSpan={cat.companies.length}
                className="border-b border-l border-line bg-surface-elevated px-2 py-2 font-mono text-[0.5rem] font-bold uppercase tracking-[0.1em]"
                style={{ color: CATEGORY_COLORS[cat.name] }}
              >
                {cat.name}
              </th>
            ))}
          </tr>
          {/* Company names — rotated */}
          <tr>
            <th className="sticky left-0 z-20 border-b border-line bg-surface" />
            {allCompanies.map((company) => (
              <th
                key={company.name}
                className="border-b border-l border-line bg-surface"
                style={{ height: "7rem", width: "52px", verticalAlign: "bottom", padding: "0 0 8px" }}
              >
                <div
                  style={{
                    writingMode: "vertical-rl",
                    transform: "rotate(180deg)",
                    whiteSpace: "nowrap",
                    fontSize: "0.6875rem",
                    fontWeight: 600,
                    color: "var(--color-ink)",
                    lineHeight: 1,
                  }}
                >
                  {company.name}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* State space row */}
          <tr>
            <td className="sticky left-0 z-10 border-b border-r border-line/50 bg-surface px-3 py-2.5 text-left align-middle font-mono text-[0.6875rem] text-muted">
              State Space
            </td>
            {allCompanies.map((company) => {
              const label = getStateSpaceLabel(company.stateSpace);
              const color = label ? (STATE_SPACE_COLORS[label] ?? "#94a3b8") : undefined;
              return (
                <td key={company.name} className="border-b border-l border-line/40 py-2.5 align-middle">
                  {label ? (
                    <div className="flex justify-center">
                      <span
                        className="rounded-full px-1.5 py-0.5 font-mono text-[0.5rem] font-bold uppercase tracking-[0.08em]"
                        style={{ background: `${color}20`, color }}
                      >
                        {label}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted/30">—</span>
                  )}
                </td>
              );
            })}
          </tr>
          {/* Boolean attribute rows */}
          {DOT_ROWS.map((row) => (
            <tr key={row.label}>
              <td className="sticky left-0 z-10 border-b border-r border-line/50 bg-surface px-3 py-2.5 text-left align-middle font-mono text-[0.6875rem] text-muted last:border-b-0">
                {row.label}
              </td>
              {allCompanies.map((company) => {
                const filled = row.derive(company);
                return (
                  <td key={company.name} className="border-b border-l border-line/40 py-2.5 align-middle last:border-b-0">
                    <div className="flex justify-center">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={filled
                          ? { background: "#60a5fa", boxShadow: "0 0 4px #60a5fa60" }
                          : { border: "1.5px solid rgba(255,255,255,0.1)" }
                        }
                      />
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CompetitiveLandscapeTable({
  entries,
  variant = "cards",
  label,
}: {
  entries: CompetitiveLandscapeEntry[];
  variant?: "cards" | "map" | "dot-matrix";
  label?: string;
}) {
  const categories = COMPETITIVE_CATEGORIES.map((cat) => ({
    name: cat,
    companies: entries.filter((e) => e.category === cat),
  })).filter((c) => c.companies.length > 0);

  return (
    <figure data-wide="true" className="w-full">
      {label && (
        <div className="mb-3 font-mono text-[0.625rem] font-bold uppercase tracking-[0.14em] text-muted">
          {label}
        </div>
      )}

      {variant === "cards" && (
        <div className="flex flex-col gap-8">
          {categories.map((cat) => (
            <div key={cat.name}>
              <div className="mb-3 font-mono text-[0.625rem] font-bold uppercase tracking-[0.14em] text-accent">
                {cat.name}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                {cat.companies.map((company) => (
                  <div
                    key={company.name}
                    className="flex flex-col gap-3 rounded-sm border border-line bg-surface-elevated p-4"
                  >
                    <div className="font-semibold leading-tight text-ink">{company.name}</div>
                    <div className="flex flex-col gap-1.5">
                      {company.valuation && (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-[0.5625rem] uppercase tracking-[0.1em] text-muted">Valuation</span>
                          <span className="text-[0.8125rem] leading-snug text-ink-secondary">{company.valuation}</span>
                        </div>
                      )}
                      {company.gtm && (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-[0.5625rem] uppercase tracking-[0.1em] text-muted">GTM</span>
                          <span className="line-clamp-3 text-[0.8125rem] leading-snug text-ink-secondary">{company.gtm}</span>
                        </div>
                      )}
                      {company.stateSpace && (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-[0.5625rem] uppercase tracking-[0.1em] text-muted">State Space</span>
                          <span className="text-[0.8125rem] leading-snug text-ink-secondary">{company.stateSpace}</span>
                        </div>
                      )}
                      {company.latency && (
                        <div className="flex flex-col gap-0.5">
                          <span className="font-mono text-[0.5625rem] uppercase tracking-[0.1em] text-muted">Latency</span>
                          <span className="text-[0.8125rem] leading-snug text-ink-secondary">{company.latency}</span>
                        </div>
                      )}
                    </div>
                    {(company.hq || company.founded) && (
                      <div className="mt-auto flex flex-wrap gap-x-3 gap-y-1 border-t border-line/50 pt-3">
                        {company.hq && <span className="font-mono text-[0.625rem] text-muted">{company.hq}</span>}
                        {company.founded && <span className="font-mono text-[0.625rem] text-muted">Est. {company.founded}</span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {variant === "map" && <PositioningMap entries={entries} />}
      {variant === "dot-matrix" && <DotMatrix entries={entries} />}

      <figcaption className="mt-4 font-mono text-xs uppercase tracking-[0.12em] text-muted">
        Competitive Landscape
      </figcaption>
    </figure>
  );
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
