export type ExperimentLink = {
  label: string;
  href: string;
  glb?: string;
  disabled?: boolean;
};

export type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "subheading"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "footnote"; id: string; text: string }
  | { type: "caption"; text: string }
  | { type: "exhibit"; src: string; alt: string; caption: string; wide?: boolean }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "experiment-card"; number: string; prompt: string; rationale: string; links: ExperimentLink[] };

export type Subsection = {
  id: string;
  title: string;
  blocks: ContentBlock[];
};

export type Section = {
  id: string;
  title: string;
  number: number;
  lead?: string;
  blocks?: ContentBlock[];
  subsections: Subsection[];
};

export type ArticleMeta = {
  title: string;
  subtitle: string;
  epigraph: { quote: string; attribution: string };
  readingTimeMinutes: number;
  sectionCount: number;
};

export type Article = ArticleMeta & {
  intro: ContentBlock[];
  sections: Section[];
};

export type TocItem = {
  id: string;
  title: string;
  level: 1 | 2;
  sectionNumber?: number;
};
