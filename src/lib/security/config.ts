/**
 * Origins and cookie flags for the local martech stack.
 *
 * Outside production, unset origins fall back to the reserved localhost
 * ports. Production has no fallback: every required origin must be an exact
 * `https` origin, mock destinations are omitted, and GTM Preview / Tag
 * Assistant are not a runtime dependency. Startup calls
 * `resolveSecurityConfig()` and fails closed when that check throws.
 */

export type SecurityEnv = {
  NODE_ENV?: string;
  APP_ORIGIN?: string;
  NEXT_PUBLIC_GTM_TAGGING_ORIGIN?: string;
  NEXT_PUBLIC_GTM_PREVIEW_ORIGIN?: string;
  NEXT_PUBLIC_RUDDERSTACK_DATAPLANE_URL?: string;
  NEXT_PUBLIC_MOCK_DESTINATIONS_ORIGIN?: string;
};

export type SecurityConfig = {
  isProduction: boolean;
  appOrigin: string;
  gtmTaggingOrigin: string;
  rudderstackOrigin: string;
  gtmPreviewOrigin?: string;
  mockDestinationsOrigin?: string;
  tagAssistantOrigin?: string;
  secureCookies: boolean;
};

export type FirstPartyCookieAttributes = {
  path: "/";
  sameSite: "Lax";
  secure: boolean;
};

const DEV_APP_ORIGIN = "http://localhost:3000";
const DEV_GTM_TAGGING_ORIGIN = "http://localhost:8080";
const DEV_GTM_PREVIEW_ORIGIN = "http://localhost:8081";
const DEV_RUDDERSTACK_ORIGIN = "http://localhost:8082";
const DEV_MOCK_DESTINATIONS_ORIGIN = "http://localhost:8090";
const TAG_ASSISTANT_ORIGIN = "https://tagassistant.google.com";

const EXACT_HTTPS_ORIGIN =
  /^https:\/\/(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?::[0-9]{1,5})?$/i;

const EXACT_ORIGIN =
  /^https?:\/\/(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?::[0-9]{1,5})?$/i;

export function resolveSecurityConfig(
  env: SecurityEnv = process.env,
  isProduction: boolean = env.NODE_ENV === "production",
): SecurityConfig {
  if (isProduction) {
    const appOrigin = requireExactHttpsOrigin("APP_ORIGIN", env.APP_ORIGIN);
    return {
      isProduction: true,
      appOrigin,
      gtmTaggingOrigin: requireExactHttpsOrigin(
        "NEXT_PUBLIC_GTM_TAGGING_ORIGIN",
        env.NEXT_PUBLIC_GTM_TAGGING_ORIGIN,
      ),
      rudderstackOrigin: requireExactHttpsOrigin(
        "NEXT_PUBLIC_RUDDERSTACK_DATAPLANE_URL",
        env.NEXT_PUBLIC_RUDDERSTACK_DATAPLANE_URL,
      ),
      secureCookies: true,
    };
  }

  const appOrigin = optionalOrigin("APP_ORIGIN", env.APP_ORIGIN, DEV_APP_ORIGIN);
  return {
    isProduction: false,
    appOrigin,
    gtmTaggingOrigin: optionalOrigin(
      "NEXT_PUBLIC_GTM_TAGGING_ORIGIN",
      env.NEXT_PUBLIC_GTM_TAGGING_ORIGIN,
      DEV_GTM_TAGGING_ORIGIN,
    ),
    rudderstackOrigin: optionalOrigin(
      "NEXT_PUBLIC_RUDDERSTACK_DATAPLANE_URL",
      env.NEXT_PUBLIC_RUDDERSTACK_DATAPLANE_URL,
      DEV_RUDDERSTACK_ORIGIN,
    ),
    gtmPreviewOrigin: optionalOrigin(
      "NEXT_PUBLIC_GTM_PREVIEW_ORIGIN",
      env.NEXT_PUBLIC_GTM_PREVIEW_ORIGIN,
      DEV_GTM_PREVIEW_ORIGIN,
    ),
    mockDestinationsOrigin: optionalOrigin(
      "NEXT_PUBLIC_MOCK_DESTINATIONS_ORIGIN",
      env.NEXT_PUBLIC_MOCK_DESTINATIONS_ORIGIN,
      DEV_MOCK_DESTINATIONS_ORIGIN,
    ),
    tagAssistantOrigin: TAG_ASSISTANT_ORIGIN,
    secureCookies: appOrigin.startsWith("https://"),
  };
}

export function firstPartyCookieAttributes(
  config: SecurityConfig,
): FirstPartyCookieAttributes {
  return {
    path: "/",
    sameSite: "Lax",
    secure: config.secureCookies,
  };
}

function requireExactHttpsOrigin(name: string, value: string | undefined): string {
  if (value === undefined || value.trim() === "") {
    throw new Error(
      `Production ${name} is required and must be an exact https origin.`,
    );
  }
  if (!EXACT_HTTPS_ORIGIN.test(value)) {
    throw new Error(
      `Production ${name} must be an exact https origin with no path, query, or wildcard. Received: ${value}`,
    );
  }
  return value;
}

function optionalOrigin(name: string, value: string | undefined, fallback: string): string {
  if (value === undefined || value.trim() === "") return fallback;
  if (!EXACT_ORIGIN.test(value)) {
    throw new Error(
      `${name} must be an exact http(s) origin with no path, query, or wildcard. Received: ${value}`,
    );
  }
  return value;
}
