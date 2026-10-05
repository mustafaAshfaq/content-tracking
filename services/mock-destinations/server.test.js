import assert from "node:assert/strict";
import { once } from "node:events";
import test from "node:test";
import { createApp } from "./server.js";

async function withServer(fn) {
  const app = createApp({ allowedOrigin: "http://localhost:3000" });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  try {
    await fn(base);
  } finally {
    server.close();
    await once(server, "close");
  }
}

test("logs GA4 and ads payloads for inspection and rejects unknown paths", async () => {
  await withServer(async (base) => {
    const ga4 = await fetch(`${base}/ga4/collect`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "http://localhost:3000" },
      body: JSON.stringify({ event: "page_view", client_id: "abc" }),
    });
    assert.equal(ga4.status, 200);
    assert.deepEqual(await ga4.json(), { ok: true, destination: "ga4" });
    assert.equal(ga4.headers.get("access-control-allow-origin"), "http://localhost:3000");

    const ads = await fetch(`${base}/ads/conversion`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversion: "signup" }),
    });
    assert.equal(ads.status, 200);

    const inspected = await fetch(`${base}/_inspect/payloads`);
    const body = await inspected.json();
    assert.equal(body.payloads.length, 2);
    assert.equal(body.payloads[0].destination, "ads");
    assert.deepEqual(body.payloads[0].body, { conversion: "signup" });
    assert.equal(body.payloads[1].destination, "ga4");
    assert.deepEqual(body.payloads[1].body, { event: "page_view", client_id: "abc" });

    const unknown = await fetch(`${base}/ga4/debug`, { method: "POST" });
    assert.equal(unknown.status, 404);
    assert.deepEqual(await unknown.json(), { error: "not_found", path: "/ga4/debug" });

    const root = await fetch(`${base}/`);
    assert.equal(root.status, 404);
  });
});

test("does not reflect a disallowed origin", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/health`, {
      headers: { origin: "http://evil.example.test" },
    });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("access-control-allow-origin"), null);
  });
});
