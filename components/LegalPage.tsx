import Link from "next/link";

type LegalSection = {
  title: string;
  paragraphs?: string[];
  items?: string[];
  blocks?: {
    title?: string;
    paragraphs?: string[];
    items?: string[];
  }[];
  contact?: boolean;
};

export default function LegalPage({
  title,
  introduction,
  sections,
}: {
  title: string;
  introduction: string[];
  sections: LegalSection[];
}) {
  return (
    <main className="legal-page">
      <div className="legal-shell">
        <Link href="/" className="legal-brand" aria-label="The Invisible Patient">
          <span className="ip-brand-mark" aria-hidden="true" />
          <span>The Invisible Patient</span>
        </Link>

        <article className="legal-card">
          <header className="legal-heading">
            <h1>{title}</h1>
            <p>Last Updated: July 28, 2026</p>
          </header>

          <div className="legal-introduction">
            {introduction.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <div className="legal-sections">
            {sections.map((section, index) => (
              <section key={section.title}>
                <h2>
                  {index + 1}. {section.title}
                </h2>
                {section.paragraphs?.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
                {section.items && (
                  <ul>
                    {section.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
                {section.blocks?.map((block, blockIndex) => (
                  <div
                    className="legal-block"
                    key={`${block.title ?? "additional"}-${blockIndex}`}
                  >
                    {block.title && <h3>{block.title}</h3>}
                    {block.paragraphs?.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {block.items && (
                      <ul>
                        {block.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
                {section.contact && (
                  <a
                    className="legal-contact"
                    href="mailto:support@invisible-patient.com"
                  >
                    Contact support
                  </a>
                )}
              </section>
            ))}
          </div>
        </article>
      </div>
    </main>
  );
}
