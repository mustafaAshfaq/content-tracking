import { describe, it, expect } from "vitest";
import { defaultConsentSnapshot, consentSnapshotSchema } from "../consent";

describe("consent snapshot", () => {
  it("defaults to necessary-only consent", () => {
    const snapshot = defaultConsentSnapshot(new Date("2024-01-01T00:00:00.000Z"));
    expect(snapshot).toMatchObject({
      necessary: true,
      analytics: false,
      marketing: false,
      personalisation: false,
    });
    expect(consentSnapshotSchema.safeParse(snapshot).success).toBe(true);
  });

  it("rejects a snapshot missing required purposes", () => {
    const result = consentSnapshotSchema.safeParse({
      necessary: true,
      analytics: false,
      policy_version: "1",
      captured_at: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });
});
