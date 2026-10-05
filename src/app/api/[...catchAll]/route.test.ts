import { describe, it, expect } from "vitest";
import { GET, OPTIONS, POST } from "./route";

describe("unknown API paths", () => {
  it("return an explicit 404 for GET, POST, and OPTIONS", async () => {
    const getResponse = GET();
    const postResponse = POST();
    const optionsResponse = OPTIONS();
    expect(getResponse.status).toBe(404);
    expect(postResponse.status).toBe(404);
    expect(optionsResponse.status).toBe(404);
    expect(await getResponse.json()).toEqual({ error: "not_found" });
    expect(await optionsResponse.json()).toEqual({ error: "not_found" });
  });
});
