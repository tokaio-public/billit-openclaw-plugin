import { describe, expect, it } from "vitest";
import { redactText, redactUnknown } from "../src/redaction.js";

describe("redaction", () => {
  it("redacts bearer tokens in plain text", () => {
    const result = redactText("Authorization: Bearer abc.def.ghi");
    expect(result).toContain("Bearer [REDACTED]");
    expect(result).not.toContain("abc.def.ghi");
  });

  it("redacts sensitive nested object keys", () => {
    const input = {
      accessToken: "secret-token",
      nested: {
        signature: "secret-signature",
        safeValue: "ok",
      },
    };

    const result = redactUnknown(input) as Record<string, unknown>;
    const nested = result.nested as Record<string, unknown>;

    expect(result.accessToken).toBe("[REDACTED]");
    expect(nested.signature).toBe("[REDACTED]");
    expect(nested.safeValue).toBe("ok");
  });
});
