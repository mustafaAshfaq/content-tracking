import { notFound } from "next/navigation";
import { ARTICLES, ARTICLE_BODIES, getArticleBySlug } from "@/content/article-manifest";
import { PageViewTracker } from "@/lib/tracking";
import { ArticleViewTracker } from "@/components/tracking/article-view-tracker";

/** Articles are static/ISR: no personalized payload ever enters the SSR response. */
export const revalidate = 3600;

export function generateStaticParams() {
  return ARTICLES.map((article) => ({ slug: article.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return {};
  return { title: article.title, description: article.dek };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  const loadBody = ARTICLE_BODIES[slug];

  if (!article || !loadBody) {
    notFound();
  }

  const { default: ArticleBody } = await loadBody();

  return (
    <article className="prose prose-zinc mx-auto max-w-3xl px-6 py-16 dark:prose-invert">
      <PageViewTracker
        routeId="article-detail"
        pageType="article"
        contentId={article.id}
        title={article.title}
      />
      <ArticleViewTracker article={article} />
      <p className="mb-2 text-sm uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
        {article.category}
      </p>
      <h1>{article.title}</h1>
      <p className="lead">{article.dek}</p>
      <ArticleBody />
    </article>
  );
}
