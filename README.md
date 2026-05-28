# World Model Deep-Dive

Editorial longform site presenting the **World Model Deep-Dive** research PDF.

## Stack

- Next.js 15 (App Router)
- React 19
- Tailwind CSS 4
- IBM Plex Sans

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Structure

- `src/content/article.ts` — structured document content (preserves PDF writing)
- `public/exhibits/` — diagrams and figures extracted from the PDF
- `src/components/` — typography, article blocks, layout (nav, TOC, hero, footer)
- `src/app/` — page shell and global styles
- `src/hooks/useScrollSpy.ts` — shared scroll-spy for nav + TOC

Content is intentionally separated from presentation so visual design can evolve without touching copy.

## Features

- Hero with epigraph, metadata, and “In this document” outline
- Sticky top nav with active section highlighting
- Desktop sticky TOC sidebar + mobile collapsible TOC
- PDF exhibits rendered as figures with captions
- Semantic content blocks: paragraphs, subheadings, lists, quotes, footnotes, tables, exhibits
