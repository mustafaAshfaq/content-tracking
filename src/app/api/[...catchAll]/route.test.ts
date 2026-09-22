import { describe, it, expect } from "vitest";
import { GET, POST } from "./route";

describe("unknown API paths", () => {
  it("return an explicit 404 for GET and POST", async () => {
    const getResponse = GET();
    const postResponse = POST();
    expect(getResponse.status).toBe(404);
    expect(postResponse.status).toBe(404);
    expect(await getResponse.json()).toEqual({ error: "not_found" });
  });
});
