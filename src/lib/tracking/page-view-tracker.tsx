"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackEvent } from "./track-event";
import type { EventPropertiesByName } from "./events";

type PageType = EventPropertiesByName["page_view"]["page_type"];

export interface PageViewDescriptor {
  routeId: string;
  pageType: PageType;
  contentId?: string;
  title?: string;
  /** Query params that participate in the route identity for dedup purposes. */
  queryAllowlist?: string[];
}

/**
 * Module-scoped so the "last committed route" survives across whichever
 * component instance renders `<PageViewTracker>`, matching the requirement
 * that `page_view` fires once per committed normalized route key rather than
 * once per framework callback (e.g. React Strict Mode double-invoking effects,
 * or re-renders that don't change the route).
 */
let lastCommittedRouteKey: string | null = null;
let lastCommittedRouteId: string | null = null;

export function buildRouteKey(
  pathname: string,
  searchParams: URLSearchParams,
  allowlist: readonly string[],
): string {
  const allowed = [...allowlist]
    .filter((key) => searchParams.has(key))
    .sort()
    .map((key) => `${key}=${searchParams.get(key)}`)
    .join("&");
  return allowed ? `${pathname}?${allowed}` : pathname;
}

export interface CommitPageViewInput {
  pathname: string;
  searchParams: URLSearchParams;
  queryAllowlist?: readonly string[];
  routeId: string;
  pageType: PageType;
  pageUrl: string;
  title?: string;
  contentId?: string;
  referrer?: string;
}

/**
 * Emits at most one `page_view` per committed normalized route key
 * (`pathname` + allowlisted query). Repeat calls for the same key — Strict
 * Mode, remounts, extra framework callbacks — are suppressed. A blocked or
 * rejected dispatch still consumes the key so consent-blocked views are never
 * replayed later.
 */
export function commitPageView(input: CommitPageViewInput) {
  const queryAllowlist = input.queryAllowlist ?? [];
  const routeKey = buildRouteKey(input.pathname, input.searchParams, queryAllowlist);
  if (routeKey === lastCommittedRouteKey) {
    return { status: "suppressed" as const };
  }

  const previousRouteId = lastCommittedRouteId ?? undefined;
  lastCommittedRouteKey = routeKey;
  lastCommittedRouteId = input.routeId;

  return trackEvent({
    name: "page_view",
    properties: {
      page_url: input.pageUrl,
      page_type: input.pageType,
      route_id: input.routeId,
      ...(input.referrer ? { referrer: input.referrer } : {}),
      ...(input.title ? { title: input.title } : {}),
      ...(input.contentId ? { content_id: input.contentId } : {}),
      ...(previousRouteId ? { previous_route_id: previousRouteId } : {}),
    },
  });
}

/** Test-only: clears the module-level dedup state between test cases. */
export function __resetPageViewTrackingForTests(): void {
  lastCommittedRouteKey = null;
  lastCommittedRouteId = null;
}

/**
 * Renders nothing. Mount once per page (e.g. from a page/template component)
 * with that page's route descriptor; emits exactly one `page_view` per
 * committed normalized route key.
 */
export function PageViewTracker(props: PageViewDescriptor) {
  // useSearchParams() opts the subtree into a Suspense boundary; wrapping
  // here means callers never have to remember to do it themselves.
  return (
    <Suspense fallback={null}>
      <PageViewTrackerInner {...props} />
    </Suspense>
  );
}

function PageViewTrackerInner({
  routeId,
  pageType,
  contentId,
  title,
  queryAllowlist = [],
}: PageViewDescriptor) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    commitPageView({
      pathname,
      searchParams: new URLSearchParams(searchParams.toString()),
      queryAllowlist,
      routeId,
      pageType,
      pageUrl:
        typeof window !== "undefined"
          ? window.location.href
          : `http://localhost${pathname}`,
      title,
      contentId,
      referrer:
        typeof document !== "undefined" && document.referrer
          ? document.referrer
          : undefined,
    });
  }, [pathname, searchParams, routeId, pageType, contentId, title, queryAllowlist]);

  return null;
}
