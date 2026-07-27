import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import { GUIDE_ARTICLES, getGuideArticle } from "@/lib/guide-articles";

export function generateStaticParams() {
  return GUIDE_ARTICLES.map((article) => ({ slug: article.slug }));
}

export default async function GuideArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getGuideArticle(slug);

  if (!article) notFound();

  return (
    <main className="min-h-screen bg-[#090d15] px-4 pb-20 pt-24">
      <Navbar />
      <article className="mx-auto max-w-2xl">
        <Link
          href="/read"
          className="article-back-button mb-10"
          aria-label="Back to Read"
        >
          <ArrowLeft size={16} />
        </Link>

        <header className="border-b border-white/8 pb-9">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-[#F5F0E8] md:text-5xl">
            {article.title}
          </h1>
          <div className="mt-5 text-xs text-[#A09890]">
            <span>{article.readTime}</span>
          </div>
          <p className="mt-8 text-lg leading-8 text-[#D4CEBD]">{article.intro}</p>
        </header>

        <div className="space-y-10 py-10">
          {article.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="mb-4 text-xl font-semibold tracking-tight text-[#F5F0E8]">
                {section.heading}
              </h2>
              {section.paragraphs?.map((paragraph) => (
                <p
                  key={paragraph}
                  className="mb-4 text-[15px] leading-7 text-[#C5BFB5]"
                >
                  {paragraph}
                </p>
              ))}
              {section.points && (
                <ul className="space-y-3">
                  {section.points.map((point) => (
                    <li
                      key={point}
                      className="flex gap-3 text-[15px] leading-7 text-[#C5BFB5]"
                    >
                      <span className="mt-3 h-1.5 w-1.5 flex-none rounded-full bg-[#B2AC88]" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <footer className="border-t border-white/8 pt-8">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#A09890]">
            Reference
          </p>
          <a
            href={article.reference.url}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-start gap-3 rounded-2xl border border-white/8 bg-[#111827] p-5 hover:border-[#B2AC88]/25"
          >
            <div className="flex-1">
              <p className="text-sm font-medium leading-6 text-[#F5F0E8]">
                {article.reference.title}
              </p>
              <p className="mt-1 text-xs text-[#A09890]">
                {article.reference.organization}
              </p>
              <p className="mt-3 text-[10px] uppercase tracking-[0.12em] text-[#B2AC88]">
                {article.reference.reviewed}
              </p>
            </div>
            <ExternalLink size={14} className="mt-1 flex-none text-[#A09890]" />
          </a>
        </footer>
      </article>
    </main>
  );
}
