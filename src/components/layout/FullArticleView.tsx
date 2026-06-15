import { ArticleSection } from "@/components/article/ArticleSection";
import { ContentBlocks } from "@/components/article/ContentBlocks";
import { Hero } from "@/components/layout/Hero";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { TableOfContents } from "@/components/layout/TableOfContents";
import { SubsectionTitle } from "@/components/typography/Prose";
import { article, toc } from "@/content/article";

export function FullArticleView() {
  return (
    <div id="top" className="mx-auto max-w-content px-6 sm:px-8 lg:px-12">
      <div
        className="min-[1060px]:grid"
        style={{
          gridTemplateColumns: "minmax(0, 16rem) minmax(0, 1fr)",
          gap: "3.8rem",
        }}
      >
        <div id="toc-sidebar" className="hidden min-[1060px]:block">
          <TableOfContents items={toc} />
        </div>

        <main className="min-w-0 pb-8">
          <Hero meta={article} />

          <div className="min-[1060px]:hidden">
            <TableOfContents items={toc} />
          </div>

          <section id="intro" className="scroll-mt-28 pt-2 sm:pt-3">
            <header className="mb-4 max-w-article">
              <SubsectionTitle id="intro-title">Introduction</SubsectionTitle>
            </header>
            <div className="max-w-article">
              <ContentBlocks blocks={article.intro} />
            </div>
          </section>

          {article.sections.map((section) => (
            <ArticleSection key={section.id} section={section} />
          ))}

          <SiteFooter />
        </main>
      </div>
    </div>
  );
}
