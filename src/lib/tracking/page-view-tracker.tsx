"use client";

import { Suspense, useEffect, useRef } from "react";
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
  const previousRouteIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const routeKey = buildRouteKey(pathname, searchParams, queryAllowlist);
    if (routeKey === lastCommittedRouteKey) {
      return;
    }

    const previousRouteId = lastCommittedRouteId ?? undefined;
    lastCommittedRouteKey = routeKey;
    lastCommittedRouteId = routeId;
    previousRouteIdRef.current = previousRouteId;

    trackEvent({
      name: "page_view",
      properties: {
        page_url:
          typeof window !== "undefined"
            ? window.location.href
            : `http://localhost${pathname}`,
        page_type: pageType,
        route_id: routeId,
        ...(typeof document !== "undefined" && document.referrer
          ? { referrer: document.referrer }
          : {}),
        ...(title ? { title } : {}),
        ...(contentId ? { content_id: contentId } : {}),
        ...(previousRouteId ? { previous_route_id: previousRouteId } : {}),
      },
    });
  }, [pathname, searchParams, routeId, pageType, contentId, title, queryAllowlist]);

  return null;
}
