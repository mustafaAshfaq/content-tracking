import express from "express";

/**
 * Mock GA4/ads destinations for the local stack. Logs whatever payload it
 * receives so a developer can inspect what would be sent to a real vendor,
 * without ever contacting one. Only documented tracking paths are accepted;
 * everything else — including the root path — returns an explicit 4xx, and
 * this service is never an open proxy.
 */

const PORT = process.env.PORT ?? 8090;
const ALLOWED_ORIGIN = process.env.APP_ORIGIN ?? "http://localhost:3000";
const ALLOWED_METHODS = "GET, POST, OPTIONS";
const ALLOWED_HEADERS = "Content-Type, Authorization, X-Write-Key";

const app = express();
app.use(express.json({ limit: "256kb" }));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin === ALLOWED_ORIGIN) {
    res.setHeader("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", ALLOWED_METHODS);
  res.setHeader("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

/** In-memory log of received payloads, most recent first. Local/dev only. */
const receivedPayloads = [];

function logPayload(destination, req, res) {
  const entry = {
    destination,
    received_at: new Date().toISOString(),
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
  };
  receivedPayloads.unshift(entry);
  receivedPayloads.length = Math.min(receivedPayloads.length, 500);
  console.log(`[mock-destinations] ${destination}`, JSON.stringify(entry));
  res.status(200).json({ ok: true, destination });
}

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

app.post("/ga4/collect", (req, res) => logPayload("ga4", req, res));
app.post("/ads/conversion", (req, res) => logPayload("ads", req, res));

/** Inspection endpoint for developers/tests — never a real destination. */
app.get("/_inspect/payloads", (_req, res) => {
  res.status(200).json({ payloads: receivedPayloads });
});

app.use((req, res) => {
  res.status(404).json({ error: "not_found", path: req.path });
});

app.listen(PORT, () => {
  console.log(`[mock-destinations] listening on :${PORT}`);
});
