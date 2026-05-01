import { createHmac, timingSafeEqual } from "node:crypto";
import { BillitHttpError, BillitValidationError } from "./errors.js";
import type {
  BillitAuthInput,
  BillitAuthTokens,
  ListInvoicesResult,
  PluginConfig,
  RetryConfig,
} from "./types.js";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withJitter(base: number): number {
  return Math.floor(base + Math.random() * Math.max(20, base / 5));
}

function isRetriable(status: number): boolean {
  return status === 429 || status >= 500;
}

function normalizeBaseUrl(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

type RequestArgs = {
  accessToken?: string;
  apiKey?: string;
  partyId?: string | number;
  idempotencyKey?: string;
  strictTransportType?: boolean;
  method: "GET" | "POST" | "DELETE" | "PATCH" | "PUT";
  path: string;
  body?: unknown;
  /** Skip the auth check; used for OAuth endpoints that don't require a token */
  skipAuthCheck?: boolean;
};

type FetchLike = typeof fetch;

export class BillitClient {
  private readonly cfg: PluginConfig;
  private readonly fetchFn: FetchLike;

  constructor(cfg: PluginConfig, fetchFn: FetchLike = fetch) {
    this.cfg = { ...cfg, apiBaseUrl: normalizeBaseUrl(cfg.apiBaseUrl) };
    this.fetchFn = fetchFn;
  }

  async exchangeCode(input: {
    code: string;
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  }): Promise<BillitAuthTokens> {
    return this.postToken({
      grant_type: "authorization_code",
      code: input.code,
      client_id: input.clientId,
      client_secret: input.clientSecret,
      redirect_uri: input.redirectUri,
    });
  }

  async refreshToken(input: {
    refreshToken: string;
    clientId: string;
    clientSecret: string;
  }): Promise<BillitAuthTokens> {
    return this.postToken({
      grant_type: "refresh_token",
      refresh_token: input.refreshToken,
      client_id: input.clientId,
      client_secret: input.clientSecret,
    });
  }

  async listInvoices(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    odataFilter?: string;
  }): Promise<ListInvoicesResult> {
    const qs = input.odataFilter ? `?$filter=${encodeURIComponent(input.odataFilter)}` : "";
    const result = await this.request({
      method: "GET",
      path: `/v1/orders${qs}`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });

    if (
      typeof result === "object" &&
      result !== null &&
      "Items" in result &&
      Array.isArray((result as { Items?: unknown }).Items)
    ) {
      return result as ListInvoicesResult;
    }

    throw new BillitValidationError("Billit list invoices response has unexpected shape");
  }

  async getInvoice(input: {
    accessToken?: string;
    apiKey?: string;
    orderId: string | number;
    partyId?: string | number;
  }): Promise<unknown> {
    return this.request({
      method: "GET",
      path: `/v1/orders/${encodeURIComponent(String(input.orderId))}`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  async createInvoice(input: {
    accessToken?: string;
    apiKey?: string;
    invoice: unknown;
    idempotencyKey: string;
    partyId?: string | number;
  }): Promise<unknown> {
    return this.request({
      method: "POST",
      path: "/v1/orders",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
      idempotencyKey: input.idempotencyKey,
      body: input.invoice,
    });
  }

  async sendInvoices(input: {
    accessToken?: string;
    apiKey?: string;
    transportType: string;
    orderIds: Array<string | number>;
    strictTransportType?: boolean;
    partyId?: string | number;
    idempotencyKey: string;
  }): Promise<unknown> {
    return this.request({
      method: "POST",
      path: "/v1/orders/commands/send",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
      idempotencyKey: input.idempotencyKey,
      strictTransportType: input.strictTransportType,
      body: {
        Transporttype: input.transportType,
        OrderIDs: input.orderIds,
      },
    });
  }

  // ── Order extensions ────────────────────────────────────────────────────────

  async patchOrder(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    orderId: string | number;
    updates: unknown;
    idempotencyKey: string;
  }): Promise<unknown> {
    return this.request({
      method: "PATCH",
      path: `/v1/orders/${encodeURIComponent(String(input.orderId))}`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
      idempotencyKey: input.idempotencyKey,
      body: input.updates,
    });
  }

  async deleteOrder(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    orderId: string | number;
  }): Promise<unknown> {
    return this.request({
      method: "DELETE",
      path: `/v1/orders/${encodeURIComponent(String(input.orderId))}`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  async addOrderPayment(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    orderId: string | number;
    amount?: number;
    description?: string;
    date?: string;
    idempotencyKey: string;
  }): Promise<unknown> {
    return this.request({
      method: "POST",
      path: `/v1/orders/${encodeURIComponent(String(input.orderId))}/payments`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
      idempotencyKey: input.idempotencyKey,
      body: {
        Amount: input.amount,
        Description: input.description,
        Date: input.date,
      },
    });
  }

  async getDeletedOrders(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
  }): Promise<unknown> {
    return this.request({
      method: "GET",
      path: "/v1/orders/deleted",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  async putOrderBookingEntries(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    orderId: string | number;
    entries: unknown;
    idempotencyKey: string;
  }): Promise<unknown> {
    return this.request({
      method: "PUT",
      path: `/v1/orders/${encodeURIComponent(String(input.orderId))}/bookingEntries`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
      idempotencyKey: input.idempotencyKey,
      body: input.entries,
    });
  }

  // ── Party ────────────────────────────────────────────────────────────────────

  async listParties(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    fullTextSearch?: string;
  }): Promise<unknown> {
    const qs = input.fullTextSearch
      ? `?fullTextSearch=${encodeURIComponent(input.fullTextSearch)}`
      : "";
    return this.request({
      method: "GET",
      path: `/v1/parties${qs}`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  async createParty(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    party: unknown;
    idempotencyKey: string;
  }): Promise<unknown> {
    return this.request({
      method: "POST",
      path: "/v1/parties",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
      idempotencyKey: input.idempotencyKey,
      body: input.party,
    });
  }

  async getParty(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    targetPartyId: string | number;
  }): Promise<unknown> {
    return this.request({
      method: "GET",
      path: `/v1/parties/${encodeURIComponent(String(input.targetPartyId))}`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  async patchParty(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    targetPartyId: string | number;
    updates: unknown;
    idempotencyKey: string;
  }): Promise<unknown> {
    return this.request({
      method: "PATCH",
      path: `/v1/parties/${encodeURIComponent(String(input.targetPartyId))}`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
      idempotencyKey: input.idempotencyKey,
      body: input.updates,
    });
  }

  // ── File ──────────────────────────────────────────────────────────────────────

  async getFile(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    fileId: string | number;
  }): Promise<unknown> {
    return this.request({
      method: "GET",
      path: `/v1/files/${encodeURIComponent(String(input.fileId))}`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  // ── Accountant feeds ─────────────────────────────────────────────────────────

  async getAccountantFeeds(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
  }): Promise<unknown> {
    return this.request({
      method: "GET",
      path: "/v1/accountant/feeds",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  async createAccountantFeed(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    name: string;
    idempotencyKey: string;
  }): Promise<unknown> {
    return this.request({
      method: "POST",
      path: "/v1/accountant/feeds",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
      idempotencyKey: input.idempotencyKey,
      body: { Name: input.name },
    });
  }

  async getAccountantFeedIndex(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    feedName: string;
  }): Promise<unknown> {
    return this.request({
      method: "GET",
      path: `/v1/accountant/feeds/${encodeURIComponent(input.feedName)}`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  async deleteAccountantFeed(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    feedName: string;
  }): Promise<unknown> {
    return this.request({
      method: "DELETE",
      path: `/v1/accountant/feeds/${encodeURIComponent(input.feedName)}`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  async confirmAccountantFeedItem(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    feedName: string;
    feedItemId: string | number;
    remoteServerName?: string;
    remotePath?: string;
    idempotencyKey: string;
  }): Promise<unknown> {
    return this.request({
      method: "POST",
      path: `/v1/accountant/feeds/${encodeURIComponent(input.feedName)}/${encodeURIComponent(String(input.feedItemId))}/confirm`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
      idempotencyKey: input.idempotencyKey,
      body: {
        RemoteServerName: input.remoteServerName,
        RemotePath: input.remotePath,
      },
    });
  }

  async downloadAccountantFeedFile(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    feedName: string;
    feedItemId: string | number;
  }): Promise<unknown> {
    return this.request({
      method: "GET",
      path: `/v1/accountant/feeds/${encodeURIComponent(input.feedName)}/${encodeURIComponent(String(input.feedItemId))}`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  // ── Account ──────────────────────────────────────────────────────────────────

  async getAccountInformation(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
  }): Promise<unknown> {
    return this.request({
      method: "GET",
      path: "/v1/account/accountInformation",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  async getSsoToken(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
  }): Promise<unknown> {
    return this.request({
      method: "GET",
      path: "/v1/account/ssoToken",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  async createSequence(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    sequence: unknown;
    idempotencyKey: string;
  }): Promise<unknown> {
    return this.request({
      method: "POST",
      path: "/v1/account/sequences",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
      idempotencyKey: input.idempotencyKey,
      body: input.sequence,
    });
  }

  async registerCompany(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    company: unknown;
    idempotencyKey: string;
  }): Promise<unknown> {
    return this.request({
      method: "POST",
      path: "/v1/account/registercompany",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
      idempotencyKey: input.idempotencyKey,
      body: input.company,
    });
  }

  // ── Document ─────────────────────────────────────────────────────────────────

  async listDocuments(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    odataFilter?: string;
  }): Promise<unknown> {
    const qs = input.odataFilter ? `?$filter=${encodeURIComponent(input.odataFilter)}` : "";
    return this.request({
      method: "GET",
      path: `/v1/documents${qs}`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  async createDocument(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    document: unknown;
    idempotencyKey: string;
  }): Promise<unknown> {
    return this.request({
      method: "POST",
      path: "/v1/documents",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
      idempotencyKey: input.idempotencyKey,
      body: input.document,
    });
  }

  async getDocument(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    documentId: string | number;
  }): Promise<unknown> {
    return this.request({
      method: "GET",
      path: `/v1/documents/${encodeURIComponent(String(input.documentId))}`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  // ── Financial transactions ────────────────────────────────────────────────────

  async importTransactionFile(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    fileId?: string;
    fileName?: string;
    mimeType?: string;
    fileContent?: string;
    idempotencyKey: string;
  }): Promise<unknown> {
    return this.request({
      method: "POST",
      path: "/v1/financialTransactions/importFile",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
      idempotencyKey: input.idempotencyKey,
      body: {
        FileID: input.fileId,
        FileName: input.fileName,
        MimeType: input.mimeType,
        FileContent: input.fileContent,
      },
    });
  }

  async importTransactions(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    transactions: unknown;
    idempotencyKey: string;
  }): Promise<unknown> {
    return this.request({
      method: "POST",
      path: "/v1/financialTransactions/commands/import",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
      idempotencyKey: input.idempotencyKey,
      body: input.transactions,
    });
  }

  async listFinancialTransactions(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
  }): Promise<unknown> {
    return this.request({
      method: "GET",
      path: "/v1/financialTransactions",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  // ── GL accounts & journals ────────────────────────────────────────────────────

  async createGLAccount(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    account: unknown;
    idempotencyKey: string;
  }): Promise<unknown> {
    return this.request({
      method: "POST",
      path: "/v1/glaccounts",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
      idempotencyKey: input.idempotencyKey,
      body: input.account,
    });
  }

  async importGLAccounts(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    accounts: unknown;
    idempotencyKey: string;
  }): Promise<unknown> {
    return this.request({
      method: "POST",
      path: "/v1/glaccounts/commands/import",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
      idempotencyKey: input.idempotencyKey,
      body: input.accounts,
    });
  }

  async importJournals(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    journals: unknown;
    idempotencyKey: string;
  }): Promise<unknown> {
    return this.request({
      method: "POST",
      path: "/v1/journals/commands/import",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
      idempotencyKey: input.idempotencyKey,
      body: input.journals,
    });
  }

  // ── Products ──────────────────────────────────────────────────────────────────

  async getProduct(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    productId: string | number;
  }): Promise<unknown> {
    return this.request({
      method: "GET",
      path: `/v1/products/${encodeURIComponent(String(input.productId))}`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  async listProducts(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
  }): Promise<unknown> {
    return this.request({
      method: "GET",
      path: "/v1/products",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  async createProduct(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    product: unknown;
    idempotencyKey: string;
  }): Promise<unknown> {
    return this.request({
      method: "POST",
      path: "/v1/products",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
      idempotencyKey: input.idempotencyKey,
      body: input.product,
    });
  }

  // ── ToProcess ────────────────────────────────────────────────────────────────

  async submitToProcess(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    payload: unknown;
    idempotencyKey: string;
  }): Promise<unknown> {
    return this.request({
      method: "POST",
      path: "/v1/toProcess",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
      idempotencyKey: input.idempotencyKey,
      body: input.payload,
    });
  }

  async deleteToProcess(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    uploadId: string | number;
  }): Promise<unknown> {
    return this.request({
      method: "DELETE",
      path: `/v1/toProcess/${encodeURIComponent(String(input.uploadId))}`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  // ── Peppol ────────────────────────────────────────────────────────────────────

  async registerPeppolParticipant(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    companyId: string;
    idempotencyKey: string;
  }): Promise<unknown> {
    return this.request({
      method: "POST",
      path: "/v1/peppol/participants",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
      idempotencyKey: input.idempotencyKey,
      body: { CompanyID: input.companyId },
    });
  }

  async deregisterPeppolParticipant(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    companyId: string;
  }): Promise<unknown> {
    return this.request({
      method: "DELETE",
      path: "/v1/peppol/participants",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
      body: { CompanyID: input.companyId },
    });
  }

  async getPeppolInbox(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
  }): Promise<unknown> {
    return this.request({
      method: "GET",
      path: "/v1/peppol/inbox",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  async confirmPeppolInboxItem(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    inboxItemId: string | number;
    idempotencyKey: string;
  }): Promise<unknown> {
    return this.request({
      method: "POST",
      path: `/v1/peppol/inbox/${encodeURIComponent(String(input.inboxItemId))}/confirm`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
      idempotencyKey: input.idempotencyKey,
    });
  }

  async refusePeppolInboxItem(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    inboxItemId: string | number;
    idempotencyKey: string;
  }): Promise<unknown> {
    return this.request({
      method: "POST",
      path: `/v1/peppol/inbox/${encodeURIComponent(String(input.inboxItemId))}/refuse`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
      idempotencyKey: input.idempotencyKey,
    });
  }

  async sendPeppolOrder(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    order: unknown;
    idempotencyKey: string;
  }): Promise<unknown> {
    return this.request({
      method: "POST",
      path: "/v1/peppol/sendOrder",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
      idempotencyKey: input.idempotencyKey,
      body: input.order,
    });
  }

  async getPeppolParticipantInfo(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    vatOrCbe: string;
  }): Promise<unknown> {
    return this.request({
      method: "GET",
      path: `/v1/peppol/participantInformation/${encodeURIComponent(input.vatOrCbe)}`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  // ── Misc ──────────────────────────────────────────────────────────────────────

  async companySearch(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    keywords: string;
  }): Promise<unknown> {
    return this.request({
      method: "GET",
      path: `/v1/misc/companysearch/${encodeURIComponent(input.keywords)}`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  async getTypeCodes(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    typeCodeType: string;
  }): Promise<unknown> {
    return this.request({
      method: "GET",
      path: `/v1/misc/typecodes/${encodeURIComponent(input.typeCodeType)}`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  async getTypeCode(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    typeCodeType: string;
    key: string;
  }): Promise<unknown> {
    return this.request({
      method: "GET",
      path: `/v1/misc/typecodes/${encodeURIComponent(input.typeCodeType)}/${encodeURIComponent(input.key)}`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  // ── OAuth2 ────────────────────────────────────────────────────────────────────

  async revokeToken(): Promise<unknown> {
    return this.request({
      method: "POST",
      path: "/OAuth2/revoke",
      skipAuthCheck: true,
    });
  }

  // ── Reports ───────────────────────────────────────────────────────────────────

  async listReports(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
  }): Promise<unknown> {
    return this.request({
      method: "GET",
      path: "/v1/reports",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  async getReport(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    reportId: string | number;
  }): Promise<unknown> {
    return this.request({
      method: "GET",
      path: `/v1/reports/${encodeURIComponent(String(input.reportId))}`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  // ── Webhook management ────────────────────────────────────────────────────────

  async createWebhook(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    entityType: string;
    entityUpdateType: string;
    webhookUrl: string;
    idempotencyKey: string;
  }): Promise<unknown> {
    return this.request({
      method: "POST",
      path: "/v1/webhooks",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
      idempotencyKey: input.idempotencyKey,
      body: {
        EntityType: input.entityType,
        EntityUpdateType: input.entityUpdateType,
        WebhookURL: input.webhookUrl,
      },
    });
  }

  async listWebhooks(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
  }): Promise<unknown> {
    return this.request({
      method: "GET",
      path: "/v1/webhooks",
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  async deleteWebhook(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    webhookId: string | number;
  }): Promise<unknown> {
    return this.request({
      method: "DELETE",
      path: `/v1/webhooks/${encodeURIComponent(String(input.webhookId))}`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
    });
  }

  async refreshWebhook(input: {
    accessToken?: string;
    apiKey?: string;
    partyId?: string | number;
    webhookId: string | number;
    idempotencyKey: string;
  }): Promise<unknown> {
    return this.request({
      method: "POST",
      path: `/v1/webhooks/refresh/${encodeURIComponent(String(input.webhookId))}`,
      accessToken: input.accessToken,
      apiKey: input.apiKey,
      partyId: input.partyId,
      idempotencyKey: input.idempotencyKey,
    });
  }

  verifyWebhookSignature(input: {
    signatureHeader: string;
    payload: string;
    secret: string;
    toleranceSeconds: number;
  }): { valid: boolean; reason?: string; timestamp?: number } {
    const parts = input.signatureHeader.split(",").map((p) => p.trim());
    const tPart = parts.find((p) => p.startsWith("t="));
    const sPart = parts.find((p) => p.startsWith("s="));
    if (!tPart || !sPart) {
      return { valid: false, reason: "missing_signature_parts" };
    }

    const timestamp = Number(tPart.slice(2));
    if (!Number.isFinite(timestamp)) {
      return { valid: false, reason: "invalid_timestamp" };
    }

    const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
    if (age > input.toleranceSeconds) {
      return { valid: false, reason: "timestamp_out_of_tolerance", timestamp };
    }

    const received = sPart.slice(2);
    if (!/^[a-fA-F0-9]{64}$/.test(received)) {
      return { valid: false, reason: "invalid_signature_format", timestamp };
    }
    const data = `${timestamp}.${input.payload}`;
    const expected = createHmac("sha256", input.secret).update(data).digest("hex");

    const a = Buffer.from(received, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      return { valid: false, reason: "signature_mismatch", timestamp };
    }

    return { valid: true, timestamp };
  }

  private async postToken(body: Record<string, string>): Promise<BillitAuthTokens> {
    const result = await this.request({
      method: "POST",
      path: "/OAuth2/token",
      body,
      skipAuthCheck: true,
    });

    const obj = result as Partial<BillitAuthTokens>;
    if (!obj.access_token || !obj.refresh_token || !obj.expires_in) {
      throw new BillitValidationError("Billit token response is incomplete");
    }
    return obj as BillitAuthTokens;
  }

  private async request(args: RequestArgs): Promise<unknown> {
    if (!args.skipAuthCheck) {
      this.assertAuthInput(args);
    }

    const retryCfg: RetryConfig = this.cfg.retries;
    let lastErr: unknown;

    for (let attempt = 1; attempt <= retryCfg.maxAttempts; attempt += 1) {
      try {
        const headers: Record<string, string> = { Accept: "application/json" };
        if (args.accessToken) {
          headers.Authorization = `Bearer ${args.accessToken}`;
        }
        if (args.apiKey) {
          headers.ApiKey = args.apiKey;
        }
        if (args.partyId !== undefined) {
          headers.PartyID = String(args.partyId);
        }
        if (args.idempotencyKey) {
          headers["Idempotency-Key"] = args.idempotencyKey;
        }
        if (args.strictTransportType !== undefined) {
          headers.StrictTransportType = String(args.strictTransportType);
        }
        if (args.body !== undefined) {
          headers["Content-Type"] = "application/json";
        }

        const res = await this.fetchFn(`${this.cfg.apiBaseUrl}${args.path}`, {
          method: args.method,
          headers,
          body: args.body === undefined ? undefined : JSON.stringify(args.body),
          signal: AbortSignal.timeout(this.cfg.timeoutMs),
        });

        const contentType = res.headers.get("content-type") || "";
        const responseBody = contentType.includes("application/json")
          ? await res.json().catch(() => ({}))
          : await res.text().catch(() => "");

        if (!res.ok) {
          const err = new BillitHttpError("Billit API request failed", res.status, responseBody);
          if (isRetriable(res.status) && attempt < retryCfg.maxAttempts) {
            const waitMs = this.computeRetryDelayMs(
              res.status,
              res.headers.get("retry-after"),
              attempt,
            );
            await sleep(waitMs);
            continue;
          }
          throw err;
        }

        return responseBody;
      } catch (err) {
        lastErr = err;
        if (attempt >= retryCfg.maxAttempts) {
          break;
        }

        const isAbort = err instanceof Error && /aborted|timeout/i.test(err.message);
        const isRetriableHttpError = err instanceof BillitHttpError && isRetriable(err.status);
        if (!isAbort && !isRetriableHttpError) {
          break;
        }

        const waitMs = this.computeRetryDelayMs(undefined, undefined, attempt);
        await sleep(waitMs);
      }
    }

    throw lastErr;
  }

  private computeRetryDelayMs(
    status: number | undefined,
    retryAfterHeader: string | null | undefined,
    attempt: number,
  ): number {
    const retryCfg: RetryConfig = this.cfg.retries;
    const fallbackMs = Math.min(
      retryCfg.maxDelayMs,
      withJitter(retryCfg.baseDelayMs * 2 ** (attempt - 1)),
    );

    if (status !== 429 || !retryAfterHeader) {
      return fallbackMs;
    }

    const numericSeconds = Number(retryAfterHeader);
    if (Number.isFinite(numericSeconds) && numericSeconds >= 0) {
      return Math.min(retryCfg.maxDelayMs, Math.floor(numericSeconds * 1000));
    }

    const parsedDate = Date.parse(retryAfterHeader);
    if (Number.isFinite(parsedDate)) {
      const diffMs = Math.max(0, parsedDate - Date.now());
      return Math.min(retryCfg.maxDelayMs, diffMs);
    }

    return fallbackMs;
  }

  private assertAuthInput(input: BillitAuthInput): void {
    if (!input.accessToken && !input.apiKey) {
      throw new BillitValidationError("Either accessToken or apiKey is required for Billit API calls");
    }
  }
}
