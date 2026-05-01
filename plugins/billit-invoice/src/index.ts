import { Type } from "@sinclair/typebox";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { BillitClient } from "./billitClient.js";
import { createHandlers } from "./toolHandlers.js";
import type { PluginConfig } from "./types.js";

type ToolDefinition = {
  name: string;
  description: string;
  parameters: unknown;
  execute: (_id: unknown, params: unknown) => Promise<unknown> | unknown;
};

type RegisterApi = {
  config?: unknown;
  registerTool: (tool: ToolDefinition, options: { optional: boolean }) => void;
};

const DEFAULT_CONFIG: PluginConfig = {
  apiBaseUrl: "https://api.sandbox.billit.be",
  timeoutMs: 10000,
  allowStateChangingOperations: false,
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
  register(api: RegisterApi) {
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
    const handlers = createHandlers(client, {
      allowStateChangingOperations: cfg.allowStateChangingOperations,
    });

    api.registerTool(
      {
        name: "billit_oauth_exchange",
        description: "Exchange Billit OAuth authorization code for access and refresh tokens (optional for API-key integrations)",
        parameters: Type.Object({
          code: Type.String(),
          clientId: Type.String(),
          clientSecret: Type.String(),
          redirectUri: Type.String(),
        }),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.oauthExchange(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_oauth_refresh",
        description: "Refresh Billit OAuth access token (optional for API-key integrations)",
        parameters: Type.Object({
          refreshToken: Type.String(),
          clientId: Type.String(),
          clientSecret: Type.String(),
        }),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.oauthRefresh(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_invoices_list",
        description: "List invoices from Billit with optional OData filter; supports accessToken or apiKey",
        parameters: Type.Object({
          accessToken: Type.Optional(Type.String()),
          apiKey: Type.Optional(Type.String()),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
          odataFilter: Type.Optional(Type.String()),
        }),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.listInvoices(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_invoice_get",
        description: "Get invoice details by Billit OrderID; supports accessToken or apiKey",
        parameters: Type.Object({
          accessToken: Type.Optional(Type.String()),
          apiKey: Type.Optional(Type.String()),
          orderId: Type.Union([Type.String(), Type.Number()]),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
        }),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.getInvoice(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    if (cfg.allowStateChangingOperations) {
      api.registerTool(
        {
          name: "billit_invoice_create",
          description: "Create a Billit invoice using /v1/orders with idempotency; supports accessToken or apiKey",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            invoice: Type.Record(Type.String(), Type.Any()),
            idempotencyKey: Type.String({ minLength: 8 }),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.createInvoice(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_invoice_send",
          description: "Send Billit invoices using /v1/orders/commands/send; supports accessToken or apiKey",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            transportType: Type.String(),
            orderIds: Type.Array(Type.Union([Type.String(), Type.Number()])),
            strictTransportType: Type.Optional(Type.Boolean()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.sendInvoice(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );
    }

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
        execute(_id: unknown, params: unknown) {
          const result = handlers.verifyWebhook(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    // ── Read-only tools (always registered if config loads) ──────────────────

    api.registerTool(
      {
        name: "billit_orders_deleted_list",
        description: "List soft-deleted orders in Billit",
        parameters: Type.Object({
          accessToken: Type.Optional(Type.String()),
          apiKey: Type.Optional(Type.String()),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
        }),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.getDeletedOrders(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_parties_list",
        description: "List parties (contacts/companies) in Billit with optional full-text search",
        parameters: Type.Object({
          accessToken: Type.Optional(Type.String()),
          apiKey: Type.Optional(Type.String()),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
          fullTextSearch: Type.Optional(Type.String()),
        }),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.listParties(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_party_get",
        description: "Get a single party (contact/company) from Billit by ID",
        parameters: Type.Object({
          accessToken: Type.Optional(Type.String()),
          apiKey: Type.Optional(Type.String()),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
          targetPartyId: Type.Union([Type.String(), Type.Number()]),
        }),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.getParty(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_file_get",
        description: "Get a Billit file by ID",
        parameters: Type.Object({
          accessToken: Type.Optional(Type.String()),
          apiKey: Type.Optional(Type.String()),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
          fileId: Type.Union([Type.String(), Type.Number()]),
        }),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.getFile(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_accountant_feeds_list",
        description: "List accountant feeds in Billit",
        parameters: Type.Object({
          accessToken: Type.Optional(Type.String()),
          apiKey: Type.Optional(Type.String()),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
        }),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.getAccountantFeeds(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_accountant_feed_index_get",
        description: "Get the index (item list) of a named accountant feed in Billit",
        parameters: Type.Object({
          accessToken: Type.Optional(Type.String()),
          apiKey: Type.Optional(Type.String()),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
          feedName: Type.String({ minLength: 1 }),
        }),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.getAccountantFeedIndex(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_accountant_feed_file_download",
        description: "Download a specific file from an accountant feed in Billit",
        parameters: Type.Object({
          accessToken: Type.Optional(Type.String()),
          apiKey: Type.Optional(Type.String()),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
          feedName: Type.String({ minLength: 1 }),
          feedItemId: Type.Union([Type.String(), Type.Number()]),
        }),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.downloadAccountantFeedFile(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_account_information_get",
        description: "Get Billit account information for the current company",
        parameters: Type.Object({
          accessToken: Type.Optional(Type.String()),
          apiKey: Type.Optional(Type.String()),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
        }),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.getAccountInformation(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_account_sso_token_get",
        description: "Get a short-lived Billit SSO token for portal access (token is redacted in response)",
        parameters: Type.Object({
          accessToken: Type.Optional(Type.String()),
          apiKey: Type.Optional(Type.String()),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
        }),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.getSsoToken(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_documents_list",
        description: "List documents in Billit with optional OData filter",
        parameters: Type.Object({
          accessToken: Type.Optional(Type.String()),
          apiKey: Type.Optional(Type.String()),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
          odataFilter: Type.Optional(Type.String()),
        }),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.listDocuments(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_document_get",
        description: "Get a Billit document by ID",
        parameters: Type.Object({
          accessToken: Type.Optional(Type.String()),
          apiKey: Type.Optional(Type.String()),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
          documentId: Type.Union([Type.String(), Type.Number()]),
        }),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.getDocument(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_financial_transactions_list",
        description: "List financial transactions in Billit",
        parameters: Type.Object({
          accessToken: Type.Optional(Type.String()),
          apiKey: Type.Optional(Type.String()),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
        }),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.listFinancialTransactions(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_products_list",
        description: "List products in Billit",
        parameters: Type.Object({
          accessToken: Type.Optional(Type.String()),
          apiKey: Type.Optional(Type.String()),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
        }),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.listProducts(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_product_get",
        description: "Get a Billit product by ID",
        parameters: Type.Object({
          accessToken: Type.Optional(Type.String()),
          apiKey: Type.Optional(Type.String()),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
          productId: Type.Union([Type.String(), Type.Number()]),
        }),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.getProduct(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_peppol_inbox_get",
        description: "Get the Peppol inbox items for the current company in Billit",
        parameters: Type.Object({
          accessToken: Type.Optional(Type.String()),
          apiKey: Type.Optional(Type.String()),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
        }),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.getPeppolInbox(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_peppol_participant_info_get",
        description: "Look up Peppol participant information by VAT or CBE number",
        parameters: Type.Object({
          accessToken: Type.Optional(Type.String()),
          apiKey: Type.Optional(Type.String()),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
          vatOrCbe: Type.String({ minLength: 1 }),
        }),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.getPeppolParticipantInfo(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_misc_company_search",
        description: "Search for a company in the Billit directory by keywords",
        parameters: Type.Object({
          accessToken: Type.Optional(Type.String()),
          apiKey: Type.Optional(Type.String()),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
          keywords: Type.String({ minLength: 1 }),
        }),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.companySearch(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_misc_typecodes_list",
        description: "List Billit type codes for a given type code category",
        parameters: Type.Object({
          accessToken: Type.Optional(Type.String()),
          apiKey: Type.Optional(Type.String()),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
          typeCodeType: Type.String({ minLength: 1 }),
        }),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.getTypeCodes(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_misc_typecode_get",
        description: "Get a specific Billit type code by category and key",
        parameters: Type.Object({
          accessToken: Type.Optional(Type.String()),
          apiKey: Type.Optional(Type.String()),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
          typeCodeType: Type.String({ minLength: 1 }),
          key: Type.String({ minLength: 1 }),
        }),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.getTypeCode(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_oauth_revoke",
        description: "Revoke the current Billit OAuth token",
        parameters: Type.Object({}),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.oauthRevoke(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_reports_list",
        description: "List available reports in Billit",
        parameters: Type.Object({
          accessToken: Type.Optional(Type.String()),
          apiKey: Type.Optional(Type.String()),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
        }),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.listReports(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_report_get",
        description: "Get a specific Billit report by ID",
        parameters: Type.Object({
          accessToken: Type.Optional(Type.String()),
          apiKey: Type.Optional(Type.String()),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
          reportId: Type.Union([Type.String(), Type.Number()]),
        }),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.getReport(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    api.registerTool(
      {
        name: "billit_webhooks_list",
        description: "List registered webhooks in Billit",
        parameters: Type.Object({
          accessToken: Type.Optional(Type.String()),
          apiKey: Type.Optional(Type.String()),
          partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
        }),
        async execute(_id: unknown, params: unknown) {
          const result = await handlers.listWebhooks(params);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        },
      },
      { optional: true },
    );

    // ── State-changing tools (only when allowStateChangingOperations=true) ───

    if (cfg.allowStateChangingOperations) {
      api.registerTool(
        {
          name: "billit_order_patch",
          description: "Patch an existing Billit order (partially update fields)",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            orderId: Type.Union([Type.String(), Type.Number()]),
            updates: Type.Record(Type.String(), Type.Any()),
            idempotencyKey: Type.String({ minLength: 8 }),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.patchOrder(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_order_delete",
          description: "Soft-delete a Billit order",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            orderId: Type.Union([Type.String(), Type.Number()]),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.deleteOrder(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_order_payment_add",
          description: "Record a manual payment against a Billit order",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            orderId: Type.Union([Type.String(), Type.Number()]),
            amount: Type.Optional(Type.Number()),
            description: Type.Optional(Type.String()),
            date: Type.Optional(Type.String()),
            idempotencyKey: Type.String({ minLength: 8 }),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.addOrderPayment(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_order_booking_entries_put",
          description: "Replace booking entries on a Billit order",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            orderId: Type.Union([Type.String(), Type.Number()]),
            entries: Type.Array(Type.Record(Type.String(), Type.Any())),
            idempotencyKey: Type.String({ minLength: 8 }),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.putOrderBookingEntries(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_party_create",
          description: "Create a new party (contact/company) in Billit",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            party: Type.Record(Type.String(), Type.Any()),
            idempotencyKey: Type.String({ minLength: 8 }),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.createParty(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_party_patch",
          description: "Partially update a party (contact/company) in Billit",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            targetPartyId: Type.Union([Type.String(), Type.Number()]),
            updates: Type.Record(Type.String(), Type.Any()),
            idempotencyKey: Type.String({ minLength: 8 }),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.patchParty(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_accountant_feed_create",
          description: "Create a named accountant feed in Billit",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            name: Type.String({ minLength: 1 }),
            idempotencyKey: Type.String({ minLength: 8 }),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.createAccountantFeed(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_accountant_feed_delete",
          description: "Delete a named accountant feed in Billit",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            feedName: Type.String({ minLength: 1 }),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.deleteAccountantFeed(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_accountant_feed_item_confirm",
          description: "Confirm delivery of an accountant feed item in Billit",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            feedName: Type.String({ minLength: 1 }),
            feedItemId: Type.Union([Type.String(), Type.Number()]),
            remoteServerName: Type.Optional(Type.String()),
            remotePath: Type.Optional(Type.String()),
            idempotencyKey: Type.String({ minLength: 8 }),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.confirmAccountantFeedItem(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_account_sequence_create",
          description: "Create a document sequence in a Billit account",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            sequence: Type.Record(Type.String(), Type.Any()),
            idempotencyKey: Type.String({ minLength: 8 }),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.createSequence(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_account_registercompany",
          description: "Register a new company in Billit",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            company: Type.Record(Type.String(), Type.Any()),
            idempotencyKey: Type.String({ minLength: 8 }),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.registerCompany(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_document_create",
          description: "Create a document in Billit",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            document: Type.Record(Type.String(), Type.Any()),
            idempotencyKey: Type.String({ minLength: 8 }),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.createDocument(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_financial_transaction_file_import",
          description: "Import a financial transaction file into Billit",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            fileId: Type.Optional(Type.String()),
            fileName: Type.Optional(Type.String()),
            mimeType: Type.Optional(Type.String()),
            fileContent: Type.Optional(Type.String()),
            idempotencyKey: Type.String({ minLength: 8 }),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.importTransactionFile(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_financial_transactions_import",
          description: "Bulk-import financial transactions into Billit",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            transactions: Type.Record(Type.String(), Type.Any()),
            idempotencyKey: Type.String({ minLength: 8 }),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.importTransactions(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_glaccount_create",
          description: "Create a GL account in Billit",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            account: Type.Record(Type.String(), Type.Any()),
            idempotencyKey: Type.String({ minLength: 8 }),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.createGLAccount(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_glaccounts_import",
          description: "Bulk-import GL accounts into Billit",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            accounts: Type.Array(Type.Record(Type.String(), Type.Any())),
            idempotencyKey: Type.String({ minLength: 8 }),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.importGLAccounts(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_journals_import",
          description: "Bulk-import journals into Billit",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            journals: Type.Array(Type.Record(Type.String(), Type.Any())),
            idempotencyKey: Type.String({ minLength: 8 }),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.importJournals(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_product_create",
          description: "Create a product in Billit",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            product: Type.Record(Type.String(), Type.Any()),
            idempotencyKey: Type.String({ minLength: 8 }),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.createProduct(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_toprocess_submit",
          description: "Submit a file or document to the Billit processing queue",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            payload: Type.Record(Type.String(), Type.Any()),
            idempotencyKey: Type.String({ minLength: 8 }),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.submitToProcess(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_toprocess_delete",
          description: "Delete a pending upload from the Billit processing queue",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            uploadId: Type.Union([Type.String(), Type.Number()]),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.deleteToProcess(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_peppol_participant_register",
          description: "Register a company as a Peppol participant in Billit",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            companyId: Type.String({ minLength: 1 }),
            idempotencyKey: Type.String({ minLength: 8 }),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.registerPeppolParticipant(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_peppol_participant_deregister",
          description: "Deregister a company from Peppol in Billit",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            companyId: Type.String({ minLength: 1 }),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.deregisterPeppolParticipant(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_peppol_inbox_item_confirm",
          description: "Confirm receipt of a Peppol inbox item in Billit",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            inboxItemId: Type.Union([Type.String(), Type.Number()]),
            idempotencyKey: Type.String({ minLength: 8 }),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.confirmPeppolInboxItem(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_peppol_inbox_item_refuse",
          description: "Refuse a Peppol inbox item in Billit",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            inboxItemId: Type.Union([Type.String(), Type.Number()]),
            idempotencyKey: Type.String({ minLength: 8 }),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.refusePeppolInboxItem(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_peppol_order_send",
          description: "Send a Peppol order via Billit",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            order: Type.Record(Type.String(), Type.Any()),
            idempotencyKey: Type.String({ minLength: 8 }),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.sendPeppolOrder(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_webhook_create",
          description: "Register a new webhook in Billit",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            entityType: Type.String({ minLength: 1 }),
            entityUpdateType: Type.String({ minLength: 1 }),
            webhookUrl: Type.String({ minLength: 1, pattern: "^https://" }),
            idempotencyKey: Type.String({ minLength: 8 }),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.createWebhook(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_webhook_delete",
          description: "Delete a registered webhook in Billit",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            webhookId: Type.Union([Type.String(), Type.Number()]),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.deleteWebhook(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );

      api.registerTool(
        {
          name: "billit_webhook_refresh",
          description: "Refresh (renew signing secret for) a Billit webhook",
          parameters: Type.Object({
            accessToken: Type.Optional(Type.String()),
            apiKey: Type.Optional(Type.String()),
            partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
            webhookId: Type.Union([Type.String(), Type.Number()]),
            idempotencyKey: Type.String({ minLength: 8 }),
            requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
          }),
          async execute(_id: unknown, params: unknown) {
            const result = await handlers.refreshWebhook(params);
            return { content: [{ type: "text", text: JSON.stringify(result) }] };
          },
        },
        { optional: true },
      );
    }
  },
});
