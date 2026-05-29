import { cn } from "@/lib/cn";

type ProseProps = {
  children: React.ReactNode;
  className?: string;
  as?: "div" | "article";
};

export function Prose({ children, className, as: Tag = "article" }: ProseProps) {
  return (
    <Tag className={cn("prose-content", className)}>{children}</Tag>
  );
}

type DisplayTitleProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
  style?: React.CSSProperties;
};

export function DisplayTitle({ children, className, id, style }: DisplayTitleProps) {
  return (
    <h1
      id={id}
      style={style}
      className={cn(
        "font-display text-[clamp(2.5rem,6vw,4.25rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink",
        className,
      )}
    >
      {children}
    </h1>
  );
}

type SectionTitleProps = {
  children: React.ReactNode;
  number?: number;
  className?: string;
  id?: string;
};

export function SectionTitle({ children, number, className, id }: SectionTitleProps) {
  return (
    <h2
      id={id}
      className={cn(
        "scroll-mt-28 font-display text-[clamp(1.75rem,4vw,2.5rem)] font-semibold leading-[1.15] tracking-[-0.02em] text-ink",
        className,
      )}
    >
      {number != null && (
        <span className="mr-3 font-mono text-sm font-medium text-muted tabular-nums">
          {String(number).padStart(2, "0")}
        </span>
      )}
      {children}
    </h2>
  );
}

type SubsectionTitleProps = {
  children: React.ReactNode;
  className?: string;
  id?: string;
};

export function SubsectionTitle({ children, className, id }: SubsectionTitleProps) {
  return (
    <h3
      id={id}
      className={cn(
        "scroll-mt-28 text-xl font-semibold leading-snug tracking-[-0.01em] text-ink sm:text-[1.35rem]",
        className,
      )}
    >
      {children}
    </h3>
  );
}

type LeadProps = {
  children: React.ReactNode;
  className?: string;
};

export function Lead({ children, className }: LeadProps) {
  return (
    <p
      className={cn(
        "text-lg leading-relaxed text-ink-secondary sm:text-[1.2rem] sm:leading-[1.65]",
        className,
      )}
    >
      {children}
    </p>
  );
}

type BodyTextProps = {
  children: React.ReactNode;
  className?: string;
};

export function BodyText({ children, className }: BodyTextProps) {
  return (
    <p className={cn("text-[1.0625rem] leading-[1.75] text-ink-secondary", className)}>
      {children}
    </p>
  );
}

type EpigraphProps = {
  quote: string;
  attribution: string;
};

export function Epigraph({ quote, attribution }: EpigraphProps) {
  return (
    <figure>
      <blockquote className="text-lg leading-[1.7] text-ink-secondary italic sm:text-[1.15rem]">
        {quote}
      </blockquote>
      <figcaption className="mt-4 text-sm text-muted">— {attribution}</figcaption>
    </figure>
  );
}
