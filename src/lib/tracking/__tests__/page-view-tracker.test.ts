import { describe, it, expect } from "vitest";
import { buildRouteKey } from "../page-view-tracker";

describe("buildRouteKey", () => {
  it("returns the bare pathname when no allowlisted query params are present", () => {
    const key = buildRouteKey("/articles/packing-light", new URLSearchParams(""), ["utm_source"]);
    expect(key).toBe("/articles/packing-light");
  });

  it("appends only allowlisted query params, sorted for stability", () => {
    const key = buildRouteKey(
      "/articles/packing-light",
      new URLSearchParams("b=2&a=1&ignored=zzz"),
      ["a", "b"],
    );
    expect(key).toBe("/articles/packing-light?a=1&b=2");
  });

  it("ignores query params not in the allowlist", () => {
    const key = buildRouteKey(
      "/articles/packing-light",
      new URLSearchParams("session=abc"),
      ["utm_source"],
    );
    expect(key).toBe("/articles/packing-light");
  });
});
