const APP_ORIGIN = process.env.APP_ORIGIN ?? "http://localhost:3000";
const GTM_TAGGING_ORIGIN =
  process.env.NEXT_PUBLIC_GTM_TAGGING_ORIGIN ?? "http://localhost:8080";
const GTM_PREVIEW_ORIGIN =
  process.env.NEXT_PUBLIC_GTM_PREVIEW_ORIGIN ?? "http://localhost:8081";
const RUDDERSTACK_ORIGIN =
  process.env.NEXT_PUBLIC_RUDDERSTACK_DATAPLANE_URL ?? "http://localhost:8082";
const MOCK_DESTINATIONS_ORIGIN =
  process.env.NEXT_PUBLIC_MOCK_DESTINATIONS_ORIGIN ?? "http://localhost:8090";
const TAG_ASSISTANT_ORIGIN = "https://tagassistant.google.com";

/**
 * Builds the Content-Security-Policy header value. Development additionally
 * allows the mock-destinations origin, the GTM preview origin, and Tag
 * Assistant; production omits all three — there is no mock origin, and
 * production has no runtime dependency on GTM Preview.
 *
 * `isProduction` defaults to the real environment but is an explicit
 * parameter so both environments' policies are directly unit-testable.
 */
export function buildContentSecurityPolicy(
  isProduction: boolean = process.env.NODE_ENV === "production",
): string {
  const connectSrc = ["'self'", APP_ORIGIN, GTM_TAGGING_ORIGIN, RUDDERSTACK_ORIGIN];
  if (!isProduction) {
    connectSrc.push(MOCK_DESTINATIONS_ORIGIN);
  }

  const frameSrc = ["'self'"];
  if (!isProduction) {
    frameSrc.push(GTM_PREVIEW_ORIGIN, TAG_ASSISTANT_ORIGIN);
  }

  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    ["connect-src", dedupe(connectSrc)],
    ["img-src", ["'self'", "data:", GTM_TAGGING_ORIGIN]],
    ["frame-src", dedupe(frameSrc)],
    ["script-src", ["'self'", GTM_TAGGING_ORIGIN]],
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'self'"]],
  ];

  return directives.map(([name, values]) => `${name} ${values.join(" ")}`).join("; ");
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}
