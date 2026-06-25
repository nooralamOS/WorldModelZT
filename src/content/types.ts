export type CompetitiveLandscapeEntry = {
  name: string;
  /** Path under /public to the company's mark, shown as the map marker */
  logo: string;
  /** Latest publicly released world model */
  model: string;
  /** Application domain(s), primary listed first (e.g. "Entertainment, Robotics") */
  application: string;
  /** Training data signal: "2D", "3D", or "2D / 3D Semantics" */
  trainingData: string;
  /** Input modalities marked in the source sheet */
  inputs: string[];
  /** Output modalities marked in the source sheet */
  outputs: string[];
  /** How long the model stays coherent */
  horizon?: string;
  /** Pricing / availability */
  pricing?: string;
  /** How the user interacts with the model */
  interaction?: string;
  mapX?: number;
  mapY?: number;
};

export type ExperimentLink = {
  label: string;
  href: string;
  embed?: string;
  glb?: string;
  spz?: string;
  disabled?: boolean;
  hint?: string;
};

export type ContentBlock =
  | { type: "paragraph"; text: string }
  | { type: "subheading"; text: string }
  | { type: "list"; ordered?: boolean; items: string[] }
  | { type: "quote"; text: string; attribution?: string }
  | { type: "footnote"; id: string; text: string }
  | { type: "caption"; text: string }
  | { type: "exhibit"; src: string; alt: string; caption: string; wide?: boolean; zoomable?: boolean }
  | { type: "table"; headers: string[]; rows: string[][] }
  | { type: "experiment-card"; number: string; prompt: string; rationale: string; links: ExperimentLink[] }
  | { type: "competitive-landscape"; entries: CompetitiveLandscapeEntry[] };

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
