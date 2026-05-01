import { Type } from "@sinclair/typebox";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { BillitClient } from "./billitClient.js";
import { createHandlers } from "./toolHandlers.js";
import type { PluginConfig } from "./types.js";

const DEFAULT_CONFIG: PluginConfig = {
  apiBaseUrl: "https://api.sandbox.billit.be",
  timeoutMs: 10000,
  retries: {
    maxAttempts: 3,
    baseDelayMs: 250,
    maxDelayMs: 4000,
  },
};

export default definePluginEntry({
  id: "billit-invoice",
  name: "Billit Invoice",
  description: "Secure Billit invoice operations",
  register(api) {
    const raw = (api.config ?? {}) as Partial<PluginConfig>;
    const cfg: PluginConfig = {
      ...DEFAULT_CONFIG,
      ...raw,
      retries: {
        ...DEFAULT_CONFIG.retries,
        ...(raw.retries ?? {}),
      },
    };

    const client = new BillitClient(cfg);
    const handlers = createHandlers(client);

    api.registerTool(
      {
        name: "billit_oauth_exchange",
        description: "Exchange Billit OAuth authorization code for access and refresh tokens",
        parameters: Type.Object({
          code: Type.String(),
          clientId: Type.String(),
          clientSecret: Type.String(),
          redirectUri: Type.String(),
        }),
        async execute(_id, params) {
          const result = await handlers.oauthExchange(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_oauth_refresh",
        description: "Refresh Billit OAuth access token",
        parameters: Type.Object({
          refreshToken: Type.String(),
          clientId: Type.String(),
          clientSecret: Type.String(),
        }),
        async execute(_id, params) {
          const result = await handlers.oauthRefresh(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_invoices_list",
        description: "List invoices from Billit with optional OData filter",
        parameters: Type.Object({
          accessToken: Type.String(),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
          odataFilter: Type.Optional(Type.String()),
        }),
        async execute(_id, params) {
          const result = await handlers.listInvoices(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_invoice_get",
        description: "Get invoice details by Billit OrderID",
        parameters: Type.Object({
          accessToken: Type.String(),
          orderId: Type.Union([Type.String(), Type.Number()]),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
        }),
        async execute(_id, params) {
          const result = await handlers.getInvoice(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_invoice_create",
        description: "Create a Billit invoice using /v1/orders with idempotency",
        parameters: Type.Object({
          accessToken: Type.String(),
          invoice: Type.Record(Type.String(), Type.Any()),
          idempotencyKey: Type.String({ minLength: 8 }),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
          requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
        }),
        async execute(_id, params) {
          const result = await handlers.createInvoice(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_invoice_send",
        description: "Send Billit invoices using /v1/orders/commands/send",
        parameters: Type.Object({
          accessToken: Type.String(),
          transportType: Type.String(),
          orderIds: Type.Array(Type.Union([Type.String(), Type.Number()])),
          strictTransportType: Type.Optional(Type.Boolean()),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
          requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
        }),
        async execute(_id, params) {
          const result = await handlers.sendInvoice(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_webhook_verify",
        description: "Verify Billit-Signature header using timestamp and HMAC SHA-256",
        parameters: Type.Object({
          signatureHeader: Type.String(),
          payload: Type.String(),
          secret: Type.String(),
          toleranceSeconds: Type.Optional(Type.Number({ minimum: 1, maximum: 3600 })),
        }),
        execute(_id, params) {
          const result = handlers.verifyWebhook(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );
  },
});
