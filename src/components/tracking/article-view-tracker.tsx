"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/tracking";
import type { ArticleMeta } from "@/content/article-manifest";

/** Renders nothing; emits `article_viewed` once per mount. */
export function ArticleViewTracker({ article }: { article: ArticleMeta }) {
  useEffect(() => {
    trackEvent({
      name: "article_viewed",
      properties: {
        content_id: article.id,
        content_version: article.content_version,
        content_type: "article",
        view_method: "loaded",
        author_id: article.author_id,
        category_ids: [article.category],
        word_count: article.word_count,
      },
    });
    // Fire once per mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.id]);

  return null;
}
