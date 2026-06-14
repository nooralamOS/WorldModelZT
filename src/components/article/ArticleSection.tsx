import type { Section } from "@/content/types";
import { ContentBlocks } from "@/components/article/ContentBlocks";
import { Lead, SectionTitle, SubsectionTitle } from "@/components/typography/Prose";

type ArticleSectionProps = {
  section: Section;
};

export function ArticleSection({ section }: ArticleSectionProps) {
  return (
    <section
      id={section.id}
      aria-labelledby={`${section.id}-title`}
      className="scroll-mt-28"
    >
      <div className="mt-10 h-0.5 max-w-article divider-dashed-t sm:mt-14" aria-hidden="true" />
      <div className="pt-10 sm:pt-14">
      <header className="mb-12 flex max-w-article flex-col gap-6">
        <SectionTitle id={`${section.id}-title`} number={section.number}>
          {section.title}
        </SectionTitle>
        {section.lead && <Lead>{section.lead}</Lead>}
      </header>

      {section.blocks && section.blocks.length > 0 && (
        <div className="mb-14 max-w-article has-[figure[data-wide=true]]:max-w-none">
          <ContentBlocks blocks={section.blocks} />
        </div>
      )}

      <div className="flex flex-col gap-10 sm:gap-12">
        {section.subsections.map((subsection) => (
          <div key={subsection.id} id={subsection.id} className="scroll-mt-28">
            <header className="mb-3 max-w-article">
              <SubsectionTitle id={`${subsection.id}-title`}>
                {subsection.title}
              </SubsectionTitle>
            </header>
            <div className="max-w-article">
              <ContentBlocks blocks={subsection.blocks} />
            </div>
          </div>
        ))}
      </div>
      </div>
    </section>
  );
}
