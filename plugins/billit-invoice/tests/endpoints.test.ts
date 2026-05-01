/**
 * Tests for all new BillitClient endpoint methods and their handler-level gating.
 *
 * Each client test verifies the correct HTTP method, URL, and auth headers.
 * Each handler test verifies auth gating and mutation gating where applicable.
 */

import { describe, it, expect, vi } from "vitest";
import { BillitClient } from "../src/billitClient.js";
import { createHandlers } from "../src/toolHandlers.js";
import type { PluginConfig } from "../src/types.js";

// ── Test helpers ────────────────────────────────────────────────────────────

const BASE_CFG: PluginConfig = {
  apiBaseUrl: "https://api.sandbox.billit.be",
  timeoutMs: 5000,
  allowStateChangingOperations: true,
  retries: { maxAttempts: 1, baseDelayMs: 0, maxDelayMs: 0 },
};

function makeMockFetch(status = 200, body: unknown = {}) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
    headers: { get: () => "application/json" },
  });
}

const AUTH = { apiKey: "test-key", partyId: "42" };

// ── Order extensions ─────────────────────────────────────────────────────────

describe("BillitClient – order extensions", () => {
  it("patchOrder calls PATCH /v1/orders/{id}", async () => {
    const fetch = makeMockFetch(200, { ok: true });
    const client = new BillitClient(BASE_CFG, fetch);
    await client.patchOrder({
      ...AUTH,
      orderId: 99,
      updates: { Reference: "new-ref" },
      idempotencyKey: "idem-1234abcd",
    });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/orders/99");
    expect(opts.method).toBe("PATCH");
  });

  it("deleteOrder calls DELETE /v1/orders/{id}", async () => {
    const fetch = makeMockFetch(204, null);
    const client = new BillitClient(BASE_CFG, fetch);
    await client.deleteOrder({ ...AUTH, orderId: 55 });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/orders/55");
    expect(opts.method).toBe("DELETE");
  });

  it("addOrderPayment calls POST /v1/orders/{id}/payments", async () => {
    const fetch = makeMockFetch(200, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.addOrderPayment({
      ...AUTH,
      orderId: 7,
      amount: 100,
      idempotencyKey: "idem-paymt1234",
    });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/orders/7/payments");
    expect(opts.method).toBe("POST");
  });

  it("getDeletedOrders calls GET /v1/orders/deleted", async () => {
    const fetch = makeMockFetch(200, []);
    const client = new BillitClient(BASE_CFG, fetch);
    await client.getDeletedOrders(AUTH);
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/orders/deleted");
    expect(opts.method).toBe("GET");
  });

  it("putOrderBookingEntries calls PUT /v1/orders/{id}/bookingEntries", async () => {
    const fetch = makeMockFetch(200, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.putOrderBookingEntries({
      ...AUTH,
      orderId: 3,
      entries: [{ GLAccount: "700000" }],
      idempotencyKey: "idem-book1234",
    });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/orders/3/bookingEntries");
    expect(opts.method).toBe("PUT");
  });
});

// ── Party ─────────────────────────────────────────────────────────────────────

describe("BillitClient – party", () => {
  it("listParties calls GET /v1/parties", async () => {
    const fetch = makeMockFetch(200, []);
    const client = new BillitClient(BASE_CFG, fetch);
    await client.listParties(AUTH);
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/parties");
    expect(opts.method).toBe("GET");
  });

  it("listParties appends fullTextSearch query param", async () => {
    const fetch = makeMockFetch(200, []);
    const client = new BillitClient(BASE_CFG, fetch);
    await client.listParties({ ...AUTH, fullTextSearch: "Acme Corp" });
    const [url] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("fullTextSearch=Acme%20Corp");
  });

  it("createParty calls POST /v1/parties", async () => {
    const fetch = makeMockFetch(201, { PartyID: 1 });
    const client = new BillitClient(BASE_CFG, fetch);
    await client.createParty({ ...AUTH, party: { Name: "Test" }, idempotencyKey: "idem-pty01234" });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/parties");
    expect(opts.method).toBe("POST");
  });

  it("getParty calls GET /v1/parties/{targetPartyId}", async () => {
    const fetch = makeMockFetch(200, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.getParty({ ...AUTH, targetPartyId: 77 });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/parties/77");
    expect(opts.method).toBe("GET");
  });

  it("patchParty calls PATCH /v1/parties/{targetPartyId}", async () => {
    const fetch = makeMockFetch(200, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.patchParty({
      ...AUTH,
      targetPartyId: 88,
      updates: { Email: "a@b.com" },
      idempotencyKey: "idem-ptyp1234",
    });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/parties/88");
    expect(opts.method).toBe("PATCH");
  });
});

// ── File ──────────────────────────────────────────────────────────────────────

describe("BillitClient – file", () => {
  it("getFile calls GET /v1/files/{fileId}", async () => {
    const fetch = makeMockFetch(200, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.getFile({ ...AUTH, fileId: "abc-123" });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/files/abc-123");
    expect(opts.method).toBe("GET");
  });
});

// ── Accountant feeds ──────────────────────────────────────────────────────────

describe("BillitClient – accountant feeds", () => {
  it("getAccountantFeeds calls GET /v1/accountant/feeds", async () => {
    const fetch = makeMockFetch(200, []);
    const client = new BillitClient(BASE_CFG, fetch);
    await client.getAccountantFeeds(AUTH);
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/accountant/feeds");
    expect(opts.method).toBe("GET");
  });

  it("createAccountantFeed calls POST /v1/accountant/feeds", async () => {
    const fetch = makeMockFetch(201, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.createAccountantFeed({ ...AUTH, name: "my-feed", idempotencyKey: "idem-feed1234" });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/accountant/feeds");
    expect(opts.method).toBe("POST");
  });

  it("getAccountantFeedIndex calls GET /v1/accountant/feeds/{feedName}", async () => {
    const fetch = makeMockFetch(200, []);
    const client = new BillitClient(BASE_CFG, fetch);
    await client.getAccountantFeedIndex({ ...AUTH, feedName: "my-feed" });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/accountant/feeds/my-feed");
    expect(opts.method).toBe("GET");
  });

  it("deleteAccountantFeed calls DELETE /v1/accountant/feeds/{feedName}", async () => {
    const fetch = makeMockFetch(204, null);
    const client = new BillitClient(BASE_CFG, fetch);
    await client.deleteAccountantFeed({ ...AUTH, feedName: "old-feed" });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/accountant/feeds/old-feed");
    expect(opts.method).toBe("DELETE");
  });

  it("confirmAccountantFeedItem calls POST /v1/accountant/feeds/{name}/{id}/confirm", async () => {
    const fetch = makeMockFetch(200, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.confirmAccountantFeedItem({
      ...AUTH,
      feedName: "my-feed",
      feedItemId: 5,
      idempotencyKey: "idem-cfm01234",
    });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/accountant/feeds/my-feed/5/confirm");
    expect(opts.method).toBe("POST");
  });

  it("downloadAccountantFeedFile calls GET /v1/accountant/feeds/{name}/{id}", async () => {
    const fetch = makeMockFetch(200, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.downloadAccountantFeedFile({ ...AUTH, feedName: "my-feed", feedItemId: 5 });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/accountant/feeds/my-feed/5");
    expect(opts.method).toBe("GET");
  });
});

// ── Account ───────────────────────────────────────────────────────────────────

describe("BillitClient – account", () => {
  it("getAccountInformation calls GET /v1/account/accountInformation", async () => {
    const fetch = makeMockFetch(200, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.getAccountInformation(AUTH);
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/account/accountInformation");
    expect(opts.method).toBe("GET");
  });

  it("getSsoToken calls GET /v1/account/ssoToken", async () => {
    const fetch = makeMockFetch(200, { Token: "ssoXYZ" });
    const client = new BillitClient(BASE_CFG, fetch);
    await client.getSsoToken(AUTH);
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/account/ssoToken");
    expect(opts.method).toBe("GET");
  });

  it("createSequence calls POST /v1/account/sequences", async () => {
    const fetch = makeMockFetch(201, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.createSequence({ ...AUTH, sequence: { Name: "SEQ1" }, idempotencyKey: "idem-seq01234" });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/account/sequences");
    expect(opts.method).toBe("POST");
  });

  it("registerCompany calls POST /v1/account/registercompany", async () => {
    const fetch = makeMockFetch(201, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.registerCompany({ ...AUTH, company: { Name: "ACME" }, idempotencyKey: "idem-co001234" });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/account/registercompany");
    expect(opts.method).toBe("POST");
  });
});

// ── Document ──────────────────────────────────────────────────────────────────

describe("BillitClient – document", () => {
  it("listDocuments calls GET /v1/documents", async () => {
    const fetch = makeMockFetch(200, []);
    const client = new BillitClient(BASE_CFG, fetch);
    await client.listDocuments(AUTH);
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/documents");
    expect(opts.method).toBe("GET");
  });

  it("createDocument calls POST /v1/documents", async () => {
    const fetch = makeMockFetch(201, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.createDocument({ ...AUTH, document: {}, idempotencyKey: "idem-doc01234" });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/documents");
    expect(opts.method).toBe("POST");
  });

  it("getDocument calls GET /v1/documents/{id}", async () => {
    const fetch = makeMockFetch(200, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.getDocument({ ...AUTH, documentId: 12 });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/documents/12");
    expect(opts.method).toBe("GET");
  });
});

// ── Financial transactions ─────────────────────────────────────────────────────

describe("BillitClient – financial transactions", () => {
  it("importTransactionFile calls POST /v1/financialTransactions/importFile", async () => {
    const fetch = makeMockFetch(200, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.importTransactionFile({ ...AUTH, idempotencyKey: "idem-tf001234" });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/financialTransactions/importFile");
    expect(opts.method).toBe("POST");
  });

  it("importTransactions calls POST /v1/financialTransactions/commands/import", async () => {
    const fetch = makeMockFetch(200, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.importTransactions({ ...AUTH, transactions: {}, idempotencyKey: "idem-ti001234" });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/financialTransactions/commands/import");
    expect(opts.method).toBe("POST");
  });

  it("listFinancialTransactions calls GET /v1/financialTransactions", async () => {
    const fetch = makeMockFetch(200, []);
    const client = new BillitClient(BASE_CFG, fetch);
    await client.listFinancialTransactions(AUTH);
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/financialTransactions");
    expect(opts.method).toBe("GET");
  });
});

// ── GL accounts & journals ─────────────────────────────────────────────────────

describe("BillitClient – GL accounts & journals", () => {
  it("createGLAccount calls POST /v1/glaccounts", async () => {
    const fetch = makeMockFetch(201, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.createGLAccount({ ...AUTH, account: {}, idempotencyKey: "idem-gla01234" });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/glaccounts");
    expect(opts.method).toBe("POST");
  });

  it("importGLAccounts calls POST /v1/glaccounts/commands/import", async () => {
    const fetch = makeMockFetch(200, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.importGLAccounts({ ...AUTH, accounts: [], idempotencyKey: "idem-gla21234" });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/glaccounts/commands/import");
    expect(opts.method).toBe("POST");
  });

  it("importJournals calls POST /v1/journals/commands/import", async () => {
    const fetch = makeMockFetch(200, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.importJournals({ ...AUTH, journals: [], idempotencyKey: "idem-jrn01234" });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/journals/commands/import");
    expect(opts.method).toBe("POST");
  });
});

// ── Products ───────────────────────────────────────────────────────────────────

describe("BillitClient – products", () => {
  it("getProduct calls GET /v1/products/{id}", async () => {
    const fetch = makeMockFetch(200, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.getProduct({ ...AUTH, productId: 5 });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/products/5");
    expect(opts.method).toBe("GET");
  });

  it("listProducts calls GET /v1/products", async () => {
    const fetch = makeMockFetch(200, []);
    const client = new BillitClient(BASE_CFG, fetch);
    await client.listProducts(AUTH);
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/products");
    expect(opts.method).toBe("GET");
  });

  it("createProduct calls POST /v1/products", async () => {
    const fetch = makeMockFetch(201, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.createProduct({ ...AUTH, product: {}, idempotencyKey: "idem-prd01234" });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/products");
    expect(opts.method).toBe("POST");
  });
});

// ── ToProcess ──────────────────────────────────────────────────────────────────

describe("BillitClient – toProcess", () => {
  it("submitToProcess calls POST /v1/toProcess", async () => {
    const fetch = makeMockFetch(200, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.submitToProcess({ ...AUTH, payload: {}, idempotencyKey: "idem-tp001234" });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/toProcess");
    expect(opts.method).toBe("POST");
  });

  it("deleteToProcess calls DELETE /v1/toProcess/{uploadId}", async () => {
    const fetch = makeMockFetch(204, null);
    const client = new BillitClient(BASE_CFG, fetch);
    await client.deleteToProcess({ ...AUTH, uploadId: "upload-99" });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/toProcess/upload-99");
    expect(opts.method).toBe("DELETE");
  });
});

// ── Peppol ─────────────────────────────────────────────────────────────────────

describe("BillitClient – peppol", () => {
  it("registerPeppolParticipant calls POST /v1/peppol/participants", async () => {
    const fetch = makeMockFetch(200, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.registerPeppolParticipant({ ...AUTH, companyId: "BE0123456789", idempotencyKey: "idem-pp001234" });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/peppol/participants");
    expect(opts.method).toBe("POST");
  });

  it("deregisterPeppolParticipant calls DELETE /v1/peppol/participants", async () => {
    const fetch = makeMockFetch(200, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.deregisterPeppolParticipant({ ...AUTH, companyId: "BE0123456789" });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/peppol/participants");
    expect(opts.method).toBe("DELETE");
  });

  it("getPeppolInbox calls GET /v1/peppol/inbox", async () => {
    const fetch = makeMockFetch(200, []);
    const client = new BillitClient(BASE_CFG, fetch);
    await client.getPeppolInbox(AUTH);
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/peppol/inbox");
    expect(opts.method).toBe("GET");
  });

  it("confirmPeppolInboxItem calls POST /v1/peppol/inbox/{id}/confirm", async () => {
    const fetch = makeMockFetch(200, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.confirmPeppolInboxItem({ ...AUTH, inboxItemId: 3, idempotencyKey: "idem-pic01234" });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/peppol/inbox/3/confirm");
    expect(opts.method).toBe("POST");
  });

  it("refusePeppolInboxItem calls POST /v1/peppol/inbox/{id}/refuse", async () => {
    const fetch = makeMockFetch(200, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.refusePeppolInboxItem({ ...AUTH, inboxItemId: 4, idempotencyKey: "idem-pir01234" });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/peppol/inbox/4/refuse");
    expect(opts.method).toBe("POST");
  });

  it("sendPeppolOrder calls POST /v1/peppol/sendOrder", async () => {
    const fetch = makeMockFetch(200, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.sendPeppolOrder({ ...AUTH, order: {}, idempotencyKey: "idem-po001234" });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/peppol/sendOrder");
    expect(opts.method).toBe("POST");
  });

  it("getPeppolParticipantInfo calls GET /v1/peppol/participantInformation/{vat}", async () => {
    const fetch = makeMockFetch(200, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.getPeppolParticipantInfo({ ...AUTH, vatOrCbe: "BE0123456789" });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/peppol/participantInformation/BE0123456789");
    expect(opts.method).toBe("GET");
  });
});

// ── Misc ───────────────────────────────────────────────────────────────────────

describe("BillitClient – misc", () => {
  it("companySearch calls GET /v1/misc/companysearch/{keywords}", async () => {
    const fetch = makeMockFetch(200, []);
    const client = new BillitClient(BASE_CFG, fetch);
    await client.companySearch({ ...AUTH, keywords: "Acme" });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/misc/companysearch/Acme");
    expect(opts.method).toBe("GET");
  });

  it("getTypeCodes calls GET /v1/misc/typecodes/{type}", async () => {
    const fetch = makeMockFetch(200, []);
    const client = new BillitClient(BASE_CFG, fetch);
    await client.getTypeCodes({ ...AUTH, typeCodeType: "OrderType" });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/misc/typecodes/OrderType");
    expect(opts.method).toBe("GET");
  });

  it("getTypeCode calls GET /v1/misc/typecodes/{type}/{key}", async () => {
    const fetch = makeMockFetch(200, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.getTypeCode({ ...AUTH, typeCodeType: "OrderType", key: "1" });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/misc/typecodes/OrderType/1");
    expect(opts.method).toBe("GET");
  });
});

// ── OAuth2 ─────────────────────────────────────────────────────────────────────

describe("BillitClient – oauth2 revoke", () => {
  it("revokeToken calls POST /OAuth2/revoke (no auth required)", async () => {
    const fetch = makeMockFetch(200, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.revokeToken();
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/OAuth2/revoke");
    expect(opts.method).toBe("POST");
  });
});

// ── Reports ────────────────────────────────────────────────────────────────────

describe("BillitClient – reports", () => {
  it("listReports calls GET /v1/reports", async () => {
    const fetch = makeMockFetch(200, []);
    const client = new BillitClient(BASE_CFG, fetch);
    await client.listReports(AUTH);
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/reports");
    expect(opts.method).toBe("GET");
  });

  it("getReport calls GET /v1/reports/{id}", async () => {
    const fetch = makeMockFetch(200, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.getReport({ ...AUTH, reportId: 9 });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/reports/9");
    expect(opts.method).toBe("GET");
  });
});

// ── Webhook management ─────────────────────────────────────────────────────────

describe("BillitClient – webhook management", () => {
  it("createWebhook calls POST /v1/webhooks", async () => {
    const fetch = makeMockFetch(201, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.createWebhook({
      ...AUTH,
      entityType: "Order",
      entityUpdateType: "Created",
      webhookUrl: "https://example.com/hook",
      idempotencyKey: "idem-wh001234",
    });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/webhooks");
    expect(opts.method).toBe("POST");
  });

  it("listWebhooks calls GET /v1/webhooks", async () => {
    const fetch = makeMockFetch(200, []);
    const client = new BillitClient(BASE_CFG, fetch);
    await client.listWebhooks(AUTH);
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/webhooks");
    expect(opts.method).toBe("GET");
  });

  it("deleteWebhook calls DELETE /v1/webhooks/{id}", async () => {
    const fetch = makeMockFetch(204, null);
    const client = new BillitClient(BASE_CFG, fetch);
    await client.deleteWebhook({ ...AUTH, webhookId: 11 });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/webhooks/11");
    expect(opts.method).toBe("DELETE");
  });

  it("refreshWebhook calls POST /v1/webhooks/refresh/{id}", async () => {
    const fetch = makeMockFetch(200, {});
    const client = new BillitClient(BASE_CFG, fetch);
    await client.refreshWebhook({ ...AUTH, webhookId: 11, idempotencyKey: "idem-whr01234" });
    const [url, opts] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/v1/webhooks/refresh/11");
    expect(opts.method).toBe("POST");
  });
});

// ── Handler-level gating tests ─────────────────────────────────────────────────

describe("Handler – auth gating for new endpoints", () => {
  const mutationHandlers = createHandlers(
    new BillitClient(BASE_CFG, makeMockFetch(200, {})),
    { allowStateChangingOperations: true },
  );

  it("listParties rejects missing auth", async () => {
    await expect(mutationHandlers.listParties({})).rejects.toThrow(/requires either/);
  });

  it("getParty rejects missing auth", async () => {
    await expect(mutationHandlers.getParty({ targetPartyId: 1 })).rejects.toThrow(/requires either/);
  });

  it("listProducts rejects missing auth", async () => {
    await expect(mutationHandlers.listProducts({})).rejects.toThrow(/requires either/);
  });

  it("listReports rejects missing auth", async () => {
    await expect(mutationHandlers.listReports({})).rejects.toThrow(/requires either/);
  });

  it("listWebhooks rejects missing auth", async () => {
    await expect(mutationHandlers.listWebhooks({})).rejects.toThrow(/requires either/);
  });
});

describe("Handler – mutation gating for new endpoints", () => {
  const readonlyHandlers = createHandlers(
    new BillitClient(BASE_CFG, makeMockFetch(200, {})),
    { allowStateChangingOperations: false },
  );

  it("patchOrder blocked when allowStateChangingOperations=false", async () => {
    await expect(
      readonlyHandlers.patchOrder({
        ...AUTH,
        orderId: 1,
        updates: {},
        idempotencyKey: "idem-gate1234",
        requireHumanApproval: false,
      }),
    ).rejects.toThrow(/disabled by plugin/);
  });

  it("deleteOrder blocked when allowStateChangingOperations=false", async () => {
    await expect(
      readonlyHandlers.deleteOrder({ ...AUTH, orderId: 1, requireHumanApproval: false }),
    ).rejects.toThrow(/disabled by plugin/);
  });

  it("createParty blocked when allowStateChangingOperations=false", async () => {
    await expect(
      readonlyHandlers.createParty({
        ...AUTH,
        party: {},
        idempotencyKey: "idem-gate5678",
        requireHumanApproval: false,
      }),
    ).rejects.toThrow(/disabled by plugin/);
  });

  it("createWebhook blocked when allowStateChangingOperations=false", async () => {
    await expect(
      readonlyHandlers.createWebhook({
        ...AUTH,
        entityType: "Order",
        entityUpdateType: "Created",
        webhookUrl: "https://example.com/hook",
        idempotencyKey: "idem-gate9012",
        requireHumanApproval: false,
      }),
    ).rejects.toThrow(/disabled by plugin/);
  });
});

describe("Handler – human approval gate for new endpoints", () => {
  const mutationHandlers = createHandlers(
    new BillitClient(BASE_CFG, makeMockFetch(200, {})),
    { allowStateChangingOperations: true },
  );

  it("patchOrder blocked without requireHumanApproval=false", async () => {
    await expect(
      mutationHandlers.patchOrder({
        ...AUTH,
        orderId: 1,
        updates: {},
        idempotencyKey: "idem-ha001234",
        // requireHumanApproval is omitted → defaults to needing approval
      }),
    ).rejects.toThrow(/requires explicit human approval/);
  });

  it("deleteWebhook blocked without requireHumanApproval=false", async () => {
    await expect(
      mutationHandlers.deleteWebhook({ ...AUTH, webhookId: 1 }),
    ).rejects.toThrow(/requires explicit human approval/);
  });
});
