/**
 * Thin wrapper around the browser `dataLayer` array (the same convention GTM
 * expects). Initializes it lazily and never throws on push; failures are
 * surfaced to the caller so `trackEvent` can turn them into an explicit
 * rejection instead of silently dropping the event.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

/** In-memory stand-in used server-side / in tests where `window` is absent. */
const serverDataLayer: unknown[] = [];

export function getDataLayer(): unknown[] {
  if (typeof window === "undefined") {
    return serverDataLayer;
  }
  window.dataLayer = window.dataLayer ?? [];
  return window.dataLayer;
}

export function pushToDataLayer(
  event: Record<string, unknown>,
): { ok: true } | { ok: false; message: string } {
  try {
    const layer = getDataLayer();
    layer.push(event);
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Unknown dataLayer error",
    };
  }
}

/** Test-only helper to reset the server-side stand-in between assertions. */
export function __resetServerDataLayerForTests(): void {
  serverDataLayer.length = 0;
}
