import Link from "next/link";
import { PageViewTracker } from "@/lib/tracking";
import { ARTICLES } from "@/content/article-manifest";

export default function Home() {
  return (
    <div className="mx-auto flex max-w-3xl flex-1 flex-col gap-8 px-6 py-16">
      <PageViewTracker routeId="home" pageType="home" title="Home" />
      <div>
        <h1 className="text-3xl font-semibold text-zinc-900 dark:text-zinc-50">
          Local Content Personalization Platform
        </h1>
        <p className="mt-2 max-w-xl text-lg text-zinc-600 dark:text-zinc-400">
          A demo article site. Browse pieces across travel, finance, health, and
          technology — each one ends with a &ldquo;Popular right now&rdquo; product
          module.
        </p>
        <Link
          href="/articles"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-foreground px-5 text-sm font-medium text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
        >
          Browse articles
        </Link>
      </div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {ARTICLES.slice(0, 4).map((article) => (
          <li key={article.id}>
            <Link
              href={`/articles/${article.slug}`}
              className="block rounded-lg border border-zinc-200 p-4 hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
            >
              <p className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                {article.category}
              </p>
              <h2 className="mt-1 text-base font-medium text-zinc-900 dark:text-zinc-50">
                {article.title}
              </h2>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
