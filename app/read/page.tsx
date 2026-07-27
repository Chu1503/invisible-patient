import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import { GUIDE_ARTICLES } from "@/lib/guide-articles";

export default function ReadPage() {
  const articlePairs = Array.from(
    { length: Math.ceil(GUIDE_ARTICLES.length / 2) },
    (_, index) => GUIDE_ARTICLES.slice(index * 2, index * 2 + 2)
  );

  return (
    <main className="min-h-screen bg-[#090d15] px-4 pb-16 pt-24">
      <Navbar />
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <h1 className="text-4xl font-semibold tracking-tight text-[#F5F0E8]">
            Read
          </h1>
        </header>

        <div className="read-pairs">
          {articlePairs.map((pair) => (
            <div
              key={pair[0].slug}
              className={pair.length === 2 ? "ip-connected-pair" : "read-single-row"}
            >
              {pair.map((article) => (
                <Link
                  key={article.slug}
                  href={`/read/${article.slug}`}
                  className="ip-panel group flex min-h-56 flex-col rounded-2xl border border-white/7 bg-[#111827] p-6 transition-colors hover:border-[#B2AC88]/30 hover:bg-[#141D2B]"
                >
                  <div className="mb-6">
                    <span className="rounded-full bg-[#B2AC88]/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#B2AC88]">
                      {article.category}
                    </span>
                  </div>
                  <h2 className="text-xl font-semibold leading-7 tracking-tight text-[#F5F0E8]">
                    {article.title}
                  </h2>
                  <p className="mt-3 flex-1 text-sm leading-6 text-[#A09890]">
                    {article.summary}
                  </p>
                  <div className="mt-6 flex items-center justify-between text-xs text-[#A09890]">
                    <span>{article.readTime}</span>
                    <span className="flex items-center gap-2 text-[#B2AC88]">
                      Read article
                      <ArrowRight
                        size={14}
                        className="transition-transform group-hover:translate-x-1"
                      />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
