import Link from "next/link";
import { PageViewTracker } from "@/lib/tracking";
import { ARTICLES } from "@/content/article-manifest";
import { CONTENT_CATEGORIES } from "@/lib/tracking";

export const metadata = {
  title: "Articles",
};

export default function ArticlesIndexPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <PageViewTracker routeId="articles-index" pageType="category" title="Articles" />
      <h1 className="mb-8 text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
        Articles
      </h1>
      {CONTENT_CATEGORIES.map((category) => {
        const categoryArticles = ARTICLES.filter((a) => a.category === category);
        return (
          <section key={category} className="mb-10">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              {category}
            </h2>
            <ul className="flex flex-col gap-4">
              {categoryArticles.map((article) => (
                <li key={article.id}>
                  <Link
                    href={`/articles/${article.slug}`}
                    className="block rounded-lg border border-zinc-200 p-4 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                  >
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
                      {article.title}
                    </h3>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {article.dek}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
