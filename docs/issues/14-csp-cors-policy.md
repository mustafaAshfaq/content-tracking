# CSP/CORS policy for local tagging

Type: grilling
Status: closed
Blocked by: 04, 09, 11

## Question

What exact CSP and CORS policy does the local app use between `localhost:3000`, the GTM
tagging/preview roles, RudderStack ingestion, and mock destinations?

- Enumerate browser-facing `connect-src`, `img-src`, and `frame-src` entries.
- Define allowed origins, methods, headers, credentials, and preflight behavior.
- Ensure the policy permits intended first-party tagging and observability but blocks unintended
  destinations.
- Specify development versus production differences and the automated assertions that enforce the
  policy.

## Decision

- Reserve deterministic local ports: Next.js `3000`, GTM tagging `8080`, GTM preview `8081`,
  RudderStack ingestion `8082`, and mock destinations `8090`.
- Development origins are explicit and allowlisted: `http://localhost:3000`,
  `http://localhost:8080`, `http://localhost:8081`, `http://localhost:8082`, and
  `http://localhost:8090`. No wildcard or reflected origins are permitted.
- The browser CSP uses `default-src 'self'`; `connect-src` includes only the app, GTM tagging,
  RudderStack ingestion, and mock-destination origins; `img-src` includes `'self'`, `data:`, and
  GTM tagging; and `frame-src` includes `'self'`, GTM preview, and development-only
  `https://tagassistant.google.com`. No unrelated analytics or advertising hosts are allowed.
- CORS allows only `http://localhost:3000`, methods `GET, POST, OPTIONS`, and the explicitly
  required `Content-Type`, `Authorization`, and `X-Write-Key` headers. Credentials are enabled
  only for contracts that require same-origin/session cookies. Preflight behavior is explicit and
  bounded; arbitrary origin reflection is forbidden.
- GTM, RudderStack, and mock destinations accept only their documented tracking/ingestion/test
  paths and payload contracts. Unknown paths return explicit 4xx responses; services are never
  open proxies.
- Production replaces localhost with exact HTTPS environment origins, fails startup when required
  origins are missing, requires `Secure` cookies, omits mock destinations, and does not allow
  GTM Preview or Tag Assistant as a runtime dependency.
- Automated tests enumerate every allowed directive and origin, reject wildcard/unintended hosts,
  exercise accepted and rejected preflights, verify path restrictions, and assert consent-denied
  flows make no requests to GTM, RudderStack, or mock destinations.
