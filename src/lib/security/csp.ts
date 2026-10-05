import { resolveSecurityConfig, type SecurityEnv } from "./config";

/**
 * Builds the Content-Security-Policy header value. Development additionally
 * allows the mock-destinations origin, the GTM preview origin, and Tag
 * Assistant; production omits all three — there is no mock origin, and
 * production has no runtime dependency on GTM Preview.
 *
 * `isProduction` defaults to the real environment but is an explicit
 * parameter so both environments' policies are directly unit-testable.
 * Production fails closed unless the required origins are exact https URLs.
 */
export function buildContentSecurityPolicy(
  isProduction: boolean = process.env.NODE_ENV === "production",
  env: SecurityEnv = process.env,
): string {
  const config = resolveSecurityConfig(env, isProduction);

  const connectSrc = [
    "'self'",
    config.appOrigin,
    config.gtmTaggingOrigin,
    config.rudderstackOrigin,
  ];
  if (config.mockDestinationsOrigin) {
    connectSrc.push(config.mockDestinationsOrigin);
  }

  const frameSrc = ["'self'"];
  if (config.gtmPreviewOrigin) frameSrc.push(config.gtmPreviewOrigin);
  if (config.tagAssistantOrigin) frameSrc.push(config.tagAssistantOrigin);

  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    ["connect-src", dedupe(connectSrc)],
    ["img-src", ["'self'", "data:", config.gtmTaggingOrigin]],
    ["frame-src", dedupe(frameSrc)],
    ["script-src", ["'self'", config.gtmTaggingOrigin]],
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
