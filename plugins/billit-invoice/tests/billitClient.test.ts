import { describe, expect, it } from "vitest";
import { BillitClient } from "../src/billitClient.js";

describe("BillitClient webhook verification", () => {
  it("rejects malformed header", () => {
    const client = new BillitClient({
      apiBaseUrl: "https://api.sandbox.billit.be",
      timeoutMs: 1000,
      retries: { maxAttempts: 1, baseDelayMs: 1, maxDelayMs: 2 },
    });

    const result = client.verifyWebhookSignature({
      signatureHeader: "invalid",
      payload: "{}",
      secret: "secret",
      toleranceSeconds: 300,
    });

    expect(result.valid).toBe(false);
  });
});
