import { describe, expect, it } from "vitest";
import { BillitValidationError } from "../src/errors.js";
import { createHandlers } from "../src/toolHandlers.js";

function createMockClient() {
  return {
    exchangeCode: async () => ({
      token_type: "Bearer",
      expires_in: 3600,
      access_token: "access",
      refresh_token: "refresh",
    }),
    refreshToken: async () => ({
      token_type: "Bearer",
      expires_in: 3600,
      access_token: "access",
      refresh_token: "refresh",
    }),
    listInvoices: async () => ({ Items: [] }),
    getInvoice: async () => ({ OrderID: 1 }),
    createInvoice: async () => ({ OrderID: 2 }),
    sendInvoices: async () => ({ success: true }),
    verifyWebhookSignature: () => ({ valid: true }),
  };
}

describe("toolHandlers validation and safety", () => {
  it("rejects listInvoices when auth is missing", async () => {
    const handlers = createHandlers(createMockClient() as any, {
      allowStateChangingOperations: false,
    });

    await expect(handlers.listInvoices({})).rejects.toThrow(
      /requires either accessToken or apiKey/,
    );
  });

  it("rejects extra fields in listInvoices params", async () => {
    const handlers = createHandlers(createMockClient() as any, {
      allowStateChangingOperations: false,
    });

    await expect(
      handlers.listInvoices({ accessToken: "x", unknownField: "blocked" }),
    ).rejects.toThrow(BillitValidationError);
  });

  it("blocks create invoice when state-changing operations are disabled", async () => {
    const handlers = createHandlers(createMockClient() as any, {
      allowStateChangingOperations: false,
    });

    await expect(
      handlers.createInvoice({
        accessToken: "x",
        invoice: { customer: "A" },
        idempotencyKey: "12345678",
        requireHumanApproval: false,
      }),
    ).rejects.toThrow(/disabled by plugin configuration/);
  });

  it("requires explicit manual override for create invoice", async () => {
    const handlers = createHandlers(createMockClient() as any, {
      allowStateChangingOperations: true,
    });

    await expect(
      handlers.createInvoice({
        accessToken: "x",
        invoice: { customer: "A" },
        idempotencyKey: "12345678",
      }),
    ).rejects.toThrow(/requires explicit human approval/);
  });
});
