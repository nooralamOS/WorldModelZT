export function SiteFooter() {
  return (
    <footer className="mt-32 pb-16">
      <div className="max-w-article border-t border-line pt-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-display text-lg font-semibold text-ink">
              World Model Deep-Dive
            </p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
              Editorial longform presentation of the research document. Structure
              and typography foundation — ready for visual refinement.
            </p>
          </div>
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">
            May 2026
          </p>
        </div>
      </div>
    </footer>
  );
}
