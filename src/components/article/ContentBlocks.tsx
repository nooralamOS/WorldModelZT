"use client";

import { useState } from "react";
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
          {embeddableLinks.map((link) => (
            <iframe
              key={link.href}
              src={link.href}
              className="absolute inset-0 h-full w-full border-0 bg-surface-elevated"
              style={{ display: activeHref === link.href ? "block" : "none" }}
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock"
              title={link.label}
            />
          ))}
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
