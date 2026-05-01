import { describe, expect, it } from "vitest";
import { BillitClient } from "../src/billitClient.js";

describe("BillitClient webhook verification", () => {
  it("rejects malformed header", () => {
    const client = new BillitClient({
      apiBaseUrl: "https://api.sandbox.billit.be",
      timeoutMs: 1000,
      allowStateChangingOperations: false,
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

  it("rejects invalid signature format", () => {
    const client = new BillitClient({
      apiBaseUrl: "https://api.sandbox.billit.be",
      timeoutMs: 1000,
      allowStateChangingOperations: false,
      retries: { maxAttempts: 1, baseDelayMs: 1, maxDelayMs: 2 },
    });

    const now = Math.floor(Date.now() / 1000);
    const result = client.verifyWebhookSignature({
      signatureHeader: `t=${now},s=not-hex`,
      payload: "{}",
      secret: "secret",
      toleranceSeconds: 300,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("invalid_signature_format");
  });
});

describe("BillitClient retries", () => {
  it("supports apiKey authentication without OAuth token", async () => {
    let seenApiKey: string | undefined;
    const fetchStub: typeof fetch = async (_input, init) => {
      const headers = init?.headers as Record<string, string>;
      seenApiKey = headers.ApiKey;
      return new Response(JSON.stringify({ Items: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const client = new BillitClient(
      {
        apiBaseUrl: "https://api.sandbox.billit.be",
        timeoutMs: 1000,
        allowStateChangingOperations: false,
        retries: { maxAttempts: 1, baseDelayMs: 1, maxDelayMs: 2 },
      },
      fetchStub,
    );

    const result = await client.listInvoices({ apiKey: "api-key", partyId: 12345 });
    expect(result).toEqual({ Items: [] });
    expect(seenApiKey).toBe("api-key");
  });

  it("rejects calls without accessToken and apiKey", async () => {
    const fetchStub: typeof fetch = async () => {
      return new Response(JSON.stringify({ Items: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const client = new BillitClient(
      {
        apiBaseUrl: "https://api.sandbox.billit.be",
        timeoutMs: 1000,
        allowStateChangingOperations: false,
        retries: { maxAttempts: 1, baseDelayMs: 1, maxDelayMs: 2 },
      },
      fetchStub,
    );

    await expect(client.listInvoices({})).rejects.toThrow(
      /Either accessToken or apiKey is required/,
    );
  });

  it("retries on 429 and eventually succeeds", async () => {
    let calls = 0;
    const fetchStub: typeof fetch = async () => {
      calls += 1;
      if (calls === 1) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429,
          headers: {
            "content-type": "application/json",
            "retry-after": "0",
          },
        });
      }

      return new Response(JSON.stringify({ Items: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    const client = new BillitClient(
      {
        apiBaseUrl: "https://api.sandbox.billit.be",
        timeoutMs: 1000,
        allowStateChangingOperations: false,
        retries: { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 5 },
      },
      fetchStub,
    );

    const result = await client.listInvoices({ accessToken: "token" });
    expect(result).toEqual({ Items: [] });
    expect(calls).toBe(2);
  });

  it("does not retry on 401", async () => {
    let calls = 0;
    const fetchStub: typeof fetch = async () => {
      calls += 1;
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "content-type": "application/json" },
      });
    };

    const client = new BillitClient(
      {
        apiBaseUrl: "https://api.sandbox.billit.be",
        timeoutMs: 1000,
        allowStateChangingOperations: false,
        retries: { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 5 },
      },
      fetchStub,
    );

    await expect(client.listInvoices({ accessToken: "token" })).rejects.toThrow(
      /Billit API request failed/,
    );
    expect(calls).toBe(1);
  });

  it("retries on 500 then fails", async () => {
    let calls = 0;
    const fetchStub: typeof fetch = async () => {
      calls += 1;
      return new Response(JSON.stringify({ error: "server_error" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
    };

    const client = new BillitClient(
      {
        apiBaseUrl: "https://api.sandbox.billit.be",
        timeoutMs: 1000,
        allowStateChangingOperations: false,
        retries: { maxAttempts: 2, baseDelayMs: 1, maxDelayMs: 5 },
      },
      fetchStub,
    );

    await expect(client.listInvoices({ accessToken: "token" })).rejects.toThrow(
      /Billit API request failed/,
    );
    expect(calls).toBe(2);
  });
});
