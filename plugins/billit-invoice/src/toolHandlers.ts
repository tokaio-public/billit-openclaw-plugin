import { createHash, randomUUID } from "node:crypto";
import type { Static } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { BillitHttpError, BillitValidationError } from "./errors.js";
import { safeLog } from "./logging.js";
import {
  AddOrderPaymentSchema,
  CompanySearchSchema,
  ConfirmAccountantFeedItemSchema,
  ConfirmPeppolInboxItemSchema,
  CreateAccountantFeedSchema,
  CreateDocumentSchema,
  CreateGLAccountSchema,
  CreatePartySchema,
  CreateProductSchema,
  CreateSequenceSchema,
  CreateWebhookSchema,
  CreateInvoiceSchema,
  DeregisterPeppolParticipantSchema,
  DeleteAccountantFeedSchema,
  DeleteOrderSchema,
  DeleteToProcessSchema,
  DeleteWebhookSchema,
  DownloadAccountantFeedFileSchema,
  GetAccountantFeedsSchema,
  GetAccountantFeedIndexSchema,
  GetAccountInformationSchema,
  GetDocumentSchema,
  GetFileSchema,
  GetDeletedOrdersSchema,
  GetInvoiceSchema,
  GetPartySchema,
  GetPeppolInboxSchema,
  GetPeppolParticipantInfoSchema,
  GetProductSchema,
  GetReportSchema,
  GetSsoTokenSchema,
  GetTypeCodeSchema,
  GetTypeCodesSchema,
  ImportGLAccountsSchema,
  ImportJournalsSchema,
  ImportTransactionFileSchema,
  ImportTransactionsSchema,
  ListDocumentsSchema,
  ListFinancialTransactionsSchema,
  ListInvoicesSchema,
  ListPartiesSchema,
  ListProductsSchema,
  ListReportsSchema,
  ListWebhooksSchema,
  OAuthExchangeSchema,
  OAuthRefreshSchema,
  OAuthRevokeSchema,
  PatchOrderSchema,
  PatchPartySchema,
  PutOrderBookingEntriesSchema,
  RefreshWebhookSchema,
  RefusePeppolInboxItemSchema,
  RegisterCompanySchema,
  RegisterPeppolParticipantSchema,
  SendInvoiceSchema,
  SendPeppolOrderSchema,
  SubmitToProcessSchema,
  VerifyWebhookSchema,
} from "./schemas";
import { redactUnknown } from "./redaction.js";
import type { BillitClient } from "./billitClient.js";

type OAuthExchangeInput = Static<typeof OAuthExchangeSchema>;
type OAuthRefreshInput = Static<typeof OAuthRefreshSchema>;
type ListInvoicesInput = Static<typeof ListInvoicesSchema>;
type GetInvoiceInput = Static<typeof GetInvoiceSchema>;
type CreateInvoiceInput = Static<typeof CreateInvoiceSchema>;
type SendInvoiceInput = Static<typeof SendInvoiceSchema>;
type VerifyWebhookInput = Static<typeof VerifyWebhookSchema>;
type PatchOrderInput = Static<typeof PatchOrderSchema>;
type DeleteOrderInput = Static<typeof DeleteOrderSchema>;
type AddOrderPaymentInput = Static<typeof AddOrderPaymentSchema>;
type GetDeletedOrdersInput = Static<typeof GetDeletedOrdersSchema>;
type PutOrderBookingEntriesInput = Static<typeof PutOrderBookingEntriesSchema>;
type ListPartiesInput = Static<typeof ListPartiesSchema>;
type CreatePartyInput = Static<typeof CreatePartySchema>;
type GetPartyInput = Static<typeof GetPartySchema>;
type PatchPartyInput = Static<typeof PatchPartySchema>;
type GetFileInput = Static<typeof GetFileSchema>;
type GetAccountantFeedsInput = Static<typeof GetAccountantFeedsSchema>;
type CreateAccountantFeedInput = Static<typeof CreateAccountantFeedSchema>;
type GetAccountantFeedIndexInput = Static<typeof GetAccountantFeedIndexSchema>;
type DeleteAccountantFeedInput = Static<typeof DeleteAccountantFeedSchema>;
type ConfirmAccountantFeedItemInput = Static<typeof ConfirmAccountantFeedItemSchema>;
type DownloadAccountantFeedFileInput = Static<typeof DownloadAccountantFeedFileSchema>;
type GetAccountInformationInput = Static<typeof GetAccountInformationSchema>;
type GetSsoTokenInput = Static<typeof GetSsoTokenSchema>;
type CreateSequenceInput = Static<typeof CreateSequenceSchema>;
type RegisterCompanyInput = Static<typeof RegisterCompanySchema>;
type ListDocumentsInput = Static<typeof ListDocumentsSchema>;
type CreateDocumentInput = Static<typeof CreateDocumentSchema>;
type GetDocumentInput = Static<typeof GetDocumentSchema>;
type ImportTransactionFileInput = Static<typeof ImportTransactionFileSchema>;
type ImportTransactionsInput = Static<typeof ImportTransactionsSchema>;
type ListFinancialTransactionsInput = Static<typeof ListFinancialTransactionsSchema>;
type CreateGLAccountInput = Static<typeof CreateGLAccountSchema>;
type ImportGLAccountsInput = Static<typeof ImportGLAccountsSchema>;
type ImportJournalsInput = Static<typeof ImportJournalsSchema>;
type GetProductInput = Static<typeof GetProductSchema>;
type ListProductsInput = Static<typeof ListProductsSchema>;
type CreateProductInput = Static<typeof CreateProductSchema>;
type SubmitToProcessInput = Static<typeof SubmitToProcessSchema>;
type DeleteToProcessInput = Static<typeof DeleteToProcessSchema>;
type RegisterPeppolParticipantInput = Static<typeof RegisterPeppolParticipantSchema>;
type DeregisterPeppolParticipantInput = Static<typeof DeregisterPeppolParticipantSchema>;
type GetPeppolInboxInput = Static<typeof GetPeppolInboxSchema>;
type ConfirmPeppolInboxItemInput = Static<typeof ConfirmPeppolInboxItemSchema>;
type RefusePeppolInboxItemInput = Static<typeof RefusePeppolInboxItemSchema>;
type SendPeppolOrderInput = Static<typeof SendPeppolOrderSchema>;
type GetPeppolParticipantInfoInput = Static<typeof GetPeppolParticipantInfoSchema>;
type CompanySearchInput = Static<typeof CompanySearchSchema>;
type GetTypeCodesInput = Static<typeof GetTypeCodesSchema>;
type GetTypeCodeInput = Static<typeof GetTypeCodeSchema>;
type ListReportsInput = Static<typeof ListReportsSchema>;
type GetReportInput = Static<typeof GetReportSchema>;
type CreateWebhookInput = Static<typeof CreateWebhookSchema>;
type ListWebhooksInput = Static<typeof ListWebhooksSchema>;
type DeleteWebhookInput = Static<typeof DeleteWebhookSchema>;
type RefreshWebhookInput = Static<typeof RefreshWebhookSchema>;

type BillitAuthInput = {
  accessToken?: string;
  apiKey?: string;
};

const validators = {
  oauthExchange: TypeCompiler.Compile(OAuthExchangeSchema),
  oauthRefresh: TypeCompiler.Compile(OAuthRefreshSchema),
  listInvoices: TypeCompiler.Compile(ListInvoicesSchema),
  getInvoice: TypeCompiler.Compile(GetInvoiceSchema),
  createInvoice: TypeCompiler.Compile(CreateInvoiceSchema),
  sendInvoice: TypeCompiler.Compile(SendInvoiceSchema),
  verifyWebhook: TypeCompiler.Compile(VerifyWebhookSchema),
  patchOrder: TypeCompiler.Compile(PatchOrderSchema),
  deleteOrder: TypeCompiler.Compile(DeleteOrderSchema),
  addOrderPayment: TypeCompiler.Compile(AddOrderPaymentSchema),
  getDeletedOrders: TypeCompiler.Compile(GetDeletedOrdersSchema),
  putOrderBookingEntries: TypeCompiler.Compile(PutOrderBookingEntriesSchema),
  listParties: TypeCompiler.Compile(ListPartiesSchema),
  createParty: TypeCompiler.Compile(CreatePartySchema),
  getParty: TypeCompiler.Compile(GetPartySchema),
  patchParty: TypeCompiler.Compile(PatchPartySchema),
  getFile: TypeCompiler.Compile(GetFileSchema),
  getAccountantFeeds: TypeCompiler.Compile(GetAccountantFeedsSchema),
  createAccountantFeed: TypeCompiler.Compile(CreateAccountantFeedSchema),
  getAccountantFeedIndex: TypeCompiler.Compile(GetAccountantFeedIndexSchema),
  deleteAccountantFeed: TypeCompiler.Compile(DeleteAccountantFeedSchema),
  confirmAccountantFeedItem: TypeCompiler.Compile(ConfirmAccountantFeedItemSchema),
  downloadAccountantFeedFile: TypeCompiler.Compile(DownloadAccountantFeedFileSchema),
  getAccountInformation: TypeCompiler.Compile(GetAccountInformationSchema),
  getSsoToken: TypeCompiler.Compile(GetSsoTokenSchema),
  createSequence: TypeCompiler.Compile(CreateSequenceSchema),
  registerCompany: TypeCompiler.Compile(RegisterCompanySchema),
  listDocuments: TypeCompiler.Compile(ListDocumentsSchema),
  createDocument: TypeCompiler.Compile(CreateDocumentSchema),
  getDocument: TypeCompiler.Compile(GetDocumentSchema),
  importTransactionFile: TypeCompiler.Compile(ImportTransactionFileSchema),
  importTransactions: TypeCompiler.Compile(ImportTransactionsSchema),
  listFinancialTransactions: TypeCompiler.Compile(ListFinancialTransactionsSchema),
  createGLAccount: TypeCompiler.Compile(CreateGLAccountSchema),
  importGLAccounts: TypeCompiler.Compile(ImportGLAccountsSchema),
  importJournals: TypeCompiler.Compile(ImportJournalsSchema),
  getProduct: TypeCompiler.Compile(GetProductSchema),
  listProducts: TypeCompiler.Compile(ListProductsSchema),
  createProduct: TypeCompiler.Compile(CreateProductSchema),
  submitToProcess: TypeCompiler.Compile(SubmitToProcessSchema),
  deleteToProcess: TypeCompiler.Compile(DeleteToProcessSchema),
  registerPeppolParticipant: TypeCompiler.Compile(RegisterPeppolParticipantSchema),
  deregisterPeppolParticipant: TypeCompiler.Compile(DeregisterPeppolParticipantSchema),
  getPeppolInbox: TypeCompiler.Compile(GetPeppolInboxSchema),
  confirmPeppolInboxItem: TypeCompiler.Compile(ConfirmPeppolInboxItemSchema),
  refusePeppolInboxItem: TypeCompiler.Compile(RefusePeppolInboxItemSchema),
  sendPeppolOrder: TypeCompiler.Compile(SendPeppolOrderSchema),
  getPeppolParticipantInfo: TypeCompiler.Compile(GetPeppolParticipantInfoSchema),
  companySearch: TypeCompiler.Compile(CompanySearchSchema),
  getTypeCodes: TypeCompiler.Compile(GetTypeCodesSchema),
  getTypeCode: TypeCompiler.Compile(GetTypeCodeSchema),
  oauthRevoke: TypeCompiler.Compile(OAuthRevokeSchema),
  listReports: TypeCompiler.Compile(ListReportsSchema),
  getReport: TypeCompiler.Compile(GetReportSchema),
  createWebhook: TypeCompiler.Compile(CreateWebhookSchema),
  listWebhooks: TypeCompiler.Compile(ListWebhooksSchema),
  deleteWebhook: TypeCompiler.Compile(DeleteWebhookSchema),
  refreshWebhook: TypeCompiler.Compile(RefreshWebhookSchema),
};

function validationError(name: string): BillitValidationError {
  return new BillitValidationError(`Invalid ${name} parameters`);
}

function humanGate(
  allowStateChangingOperations: boolean,
  requireHumanApproval: boolean | undefined,
  operation: string,
): void {
  if (!allowStateChangingOperations) {
    throw new BillitValidationError(
      `${operation} is disabled by plugin configuration. Enable allowStateChangingOperations only after explicit approval.`,
    );
  }
  if (requireHumanApproval !== false) {
    throw new BillitValidationError(
      `${operation} requires explicit human approval. Set requireHumanApproval=false only after manual review.`,
    );
  }
}

function sanitizeError(err: unknown): string {
  if (err instanceof BillitHttpError) {
    return `Billit API error ${err.status}: ${JSON.stringify(redactUnknown(err.body))}`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Unexpected error";
}

function assertToolAuth(input: BillitAuthInput, operation: string): void {
  if (!input.accessToken && !input.apiKey) {
    throw new BillitValidationError(`${operation} requires either accessToken or apiKey`);
  }
}

export function createHandlers(client: BillitClient, options: { allowStateChangingOperations: boolean }) {
  return {
    async oauthExchange(params: unknown): Promise<unknown> {
      if (!validators.oauthExchange.Check(params)) throw validationError("oauthExchange");
      const input = params as OAuthExchangeInput;
      try {
        const result = await client.exchangeCode(input);
        safeLog("billit.oauth.exchange.success", { expiresIn: result.expires_in });
        return {
          token_type: result.token_type,
          expires_in: result.expires_in,
          access_token: "[REDACTED]",
          refresh_token: "[REDACTED]",
          token_hash: createHash("sha256").update(result.access_token).digest("hex"),
        };
      } catch (err) {
        safeLog("billit.oauth.exchange.error", { error: sanitizeError(err) });
        throw err;
      }
    },

    async oauthRefresh(params: unknown): Promise<unknown> {
      if (!validators.oauthRefresh.Check(params)) throw validationError("oauthRefresh");
      const input = params as OAuthRefreshInput;
      try {
        const result = await client.refreshToken(input);
        safeLog("billit.oauth.refresh.success", { expiresIn: result.expires_in });
        return {
          token_type: result.token_type,
          expires_in: result.expires_in,
          access_token: "[REDACTED]",
          refresh_token: "[REDACTED]",
          token_hash: createHash("sha256").update(result.access_token).digest("hex"),
        };
      } catch (err) {
        safeLog("billit.oauth.refresh.error", { error: sanitizeError(err) });
        throw err;
      }
    },

    async listInvoices(params: unknown): Promise<unknown> {
      if (!validators.listInvoices.Check(params)) throw validationError("listInvoices");
      const input = params as ListInvoicesInput;
      assertToolAuth(input, "billit_invoices_list");
      const result = await client.listInvoices(input);
      safeLog("billit.invoices.list.success", { itemCount: result.Items?.length ?? 0 });
      return redactUnknown(result);
    },

    async getInvoice(params: unknown): Promise<unknown> {
      if (!validators.getInvoice.Check(params)) throw validationError("getInvoice");
      const input = params as GetInvoiceInput;
      assertToolAuth(input, "billit_invoice_get");
      const result = await client.getInvoice(input);
      safeLog("billit.invoice.get.success", { orderId: String(input.orderId) });
      return redactUnknown(result);
    },

    async createInvoice(params: unknown): Promise<unknown> {
      if (!validators.createInvoice.Check(params)) throw validationError("createInvoice");
      const input = params as CreateInvoiceInput;
      assertToolAuth(input, "billit_invoice_create");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Invoice creation");
      const idempotencyKey = input.idempotencyKey || randomUUID();
      const result = await client.createInvoice({
        accessToken: input.accessToken,
        apiKey: input.apiKey,
        partyId: input.partyId,
        invoice: input.invoice,
        idempotencyKey,
      });
      safeLog("billit.invoice.create.success", { idempotencyKey });
      return redactUnknown(result);
    },

    async sendInvoice(params: unknown): Promise<unknown> {
      if (!validators.sendInvoice.Check(params)) throw validationError("sendInvoice");
      const input = params as SendInvoiceInput;
      assertToolAuth(input, "billit_invoice_send");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Invoice sending");
      const idempotencyKey = randomUUID();
      const result = await client.sendInvoices({
        accessToken: input.accessToken,
        apiKey: input.apiKey,
        partyId: input.partyId,
        orderIds: input.orderIds,
        transportType: input.transportType,
        strictTransportType: input.strictTransportType,
        idempotencyKey,
      });
      safeLog("billit.invoice.send.success", {
        transportType: input.transportType,
        orderCount: input.orderIds.length,
        idempotencyKey,
      });
      return redactUnknown(result);
    },

    verifyWebhook(params: unknown): unknown {
      if (!validators.verifyWebhook.Check(params)) throw validationError("verifyWebhook");
      const input = params as VerifyWebhookInput;
      const verification = client.verifyWebhookSignature({
        signatureHeader: input.signatureHeader,
        payload: input.payload,
        secret: input.secret,
        toleranceSeconds: input.toleranceSeconds ?? 300,
      });
      safeLog("billit.webhook.verify", { valid: verification.valid, reason: verification.reason });
      return verification;
    },

    // ── Order extensions ────────────────────────────────────────────────────

    async patchOrder(params: unknown): Promise<unknown> {
      if (!validators.patchOrder.Check(params)) throw validationError("patchOrder");
      const input = params as PatchOrderInput;
      assertToolAuth(input, "billit_order_patch");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Order patch");
      const result = await client.patchOrder({
        accessToken: input.accessToken,
        apiKey: input.apiKey,
        partyId: input.partyId,
        orderId: input.orderId,
        updates: input.updates,
        idempotencyKey: input.idempotencyKey,
      });
      safeLog("billit.order.patch.success", { orderId: String(input.orderId) });
      return redactUnknown(result);
    },

    async deleteOrder(params: unknown): Promise<unknown> {
      if (!validators.deleteOrder.Check(params)) throw validationError("deleteOrder");
      const input = params as DeleteOrderInput;
      assertToolAuth(input, "billit_order_delete");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Order deletion");
      const result = await client.deleteOrder({
        accessToken: input.accessToken,
        apiKey: input.apiKey,
        partyId: input.partyId,
        orderId: input.orderId,
      });
      safeLog("billit.order.delete.success", { orderId: String(input.orderId) });
      return redactUnknown(result);
    },

    async addOrderPayment(params: unknown): Promise<unknown> {
      if (!validators.addOrderPayment.Check(params)) throw validationError("addOrderPayment");
      const input = params as AddOrderPaymentInput;
      assertToolAuth(input, "billit_order_payment_add");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Order payment");
      const result = await client.addOrderPayment({
        accessToken: input.accessToken,
        apiKey: input.apiKey,
        partyId: input.partyId,
        orderId: input.orderId,
        amount: input.amount,
        description: input.description,
        date: input.date,
        idempotencyKey: input.idempotencyKey,
      });
      safeLog("billit.order.payment.success", { orderId: String(input.orderId) });
      return redactUnknown(result);
    },

    async getDeletedOrders(params: unknown): Promise<unknown> {
      if (!validators.getDeletedOrders.Check(params)) throw validationError("getDeletedOrders");
      const input = params as GetDeletedOrdersInput;
      assertToolAuth(input, "billit_orders_deleted_list");
      const result = await client.getDeletedOrders(input);
      safeLog("billit.orders.deleted.list.success", {});
      return redactUnknown(result);
    },

    async putOrderBookingEntries(params: unknown): Promise<unknown> {
      if (!validators.putOrderBookingEntries.Check(params)) throw validationError("putOrderBookingEntries");
      const input = params as PutOrderBookingEntriesInput;
      assertToolAuth(input, "billit_order_booking_entries_put");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Order booking entries");
      const result = await client.putOrderBookingEntries({
        accessToken: input.accessToken,
        apiKey: input.apiKey,
        partyId: input.partyId,
        orderId: input.orderId,
        entries: input.entries,
        idempotencyKey: input.idempotencyKey,
      });
      safeLog("billit.order.bookingEntries.success", { orderId: String(input.orderId) });
      return redactUnknown(result);
    },

    // ── Party ────────────────────────────────────────────────────────────────

    async listParties(params: unknown): Promise<unknown> {
      if (!validators.listParties.Check(params)) throw validationError("listParties");
      const input = params as ListPartiesInput;
      assertToolAuth(input, "billit_parties_list");
      const result = await client.listParties(input);
      safeLog("billit.parties.list.success", {});
      return redactUnknown(result);
    },

    async createParty(params: unknown): Promise<unknown> {
      if (!validators.createParty.Check(params)) throw validationError("createParty");
      const input = params as CreatePartyInput;
      assertToolAuth(input, "billit_party_create");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Party creation");
      const result = await client.createParty({
        accessToken: input.accessToken,
        apiKey: input.apiKey,
        partyId: input.partyId,
        party: input.party,
        idempotencyKey: input.idempotencyKey,
      });
      safeLog("billit.party.create.success", {});
      return redactUnknown(result);
    },

    async getParty(params: unknown): Promise<unknown> {
      if (!validators.getParty.Check(params)) throw validationError("getParty");
      const input = params as GetPartyInput;
      assertToolAuth(input, "billit_party_get");
      const result = await client.getParty(input);
      safeLog("billit.party.get.success", { targetPartyId: String(input.targetPartyId) });
      return redactUnknown(result);
    },

    async patchParty(params: unknown): Promise<unknown> {
      if (!validators.patchParty.Check(params)) throw validationError("patchParty");
      const input = params as PatchPartyInput;
      assertToolAuth(input, "billit_party_patch");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Party patch");
      const result = await client.patchParty({
        accessToken: input.accessToken,
        apiKey: input.apiKey,
        partyId: input.partyId,
        targetPartyId: input.targetPartyId,
        updates: input.updates,
        idempotencyKey: input.idempotencyKey,
      });
      safeLog("billit.party.patch.success", { targetPartyId: String(input.targetPartyId) });
      return redactUnknown(result);
    },

    // ── File ──────────────────────────────────────────────────────────────────

    async getFile(params: unknown): Promise<unknown> {
      if (!validators.getFile.Check(params)) throw validationError("getFile");
      const input = params as GetFileInput;
      assertToolAuth(input, "billit_file_get");
      const result = await client.getFile(input);
      safeLog("billit.file.get.success", { fileId: String(input.fileId) });
      return redactUnknown(result);
    },

    // ── Accountant feeds ─────────────────────────────────────────────────────

    async getAccountantFeeds(params: unknown): Promise<unknown> {
      if (!validators.getAccountantFeeds.Check(params)) throw validationError("getAccountantFeeds");
      const input = params as GetAccountantFeedsInput;
      assertToolAuth(input, "billit_accountant_feeds_list");
      const result = await client.getAccountantFeeds(input);
      safeLog("billit.accountant.feeds.list.success", {});
      return redactUnknown(result);
    },

    async createAccountantFeed(params: unknown): Promise<unknown> {
      if (!validators.createAccountantFeed.Check(params)) throw validationError("createAccountantFeed");
      const input = params as CreateAccountantFeedInput;
      assertToolAuth(input, "billit_accountant_feed_create");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Accountant feed creation");
      const result = await client.createAccountantFeed({
        accessToken: input.accessToken,
        apiKey: input.apiKey,
        partyId: input.partyId,
        name: input.name,
        idempotencyKey: input.idempotencyKey,
      });
      safeLog("billit.accountant.feed.create.success", {});
      return redactUnknown(result);
    },

    async getAccountantFeedIndex(params: unknown): Promise<unknown> {
      if (!validators.getAccountantFeedIndex.Check(params)) throw validationError("getAccountantFeedIndex");
      const input = params as GetAccountantFeedIndexInput;
      assertToolAuth(input, "billit_accountant_feed_index_get");
      const result = await client.getAccountantFeedIndex(input);
      safeLog("billit.accountant.feed.index.success", { feedName: input.feedName });
      return redactUnknown(result);
    },

    async deleteAccountantFeed(params: unknown): Promise<unknown> {
      if (!validators.deleteAccountantFeed.Check(params)) throw validationError("deleteAccountantFeed");
      const input = params as DeleteAccountantFeedInput;
      assertToolAuth(input, "billit_accountant_feed_delete");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Accountant feed deletion");
      const result = await client.deleteAccountantFeed(input);
      safeLog("billit.accountant.feed.delete.success", { feedName: input.feedName });
      return redactUnknown(result);
    },

    async confirmAccountantFeedItem(params: unknown): Promise<unknown> {
      if (!validators.confirmAccountantFeedItem.Check(params)) throw validationError("confirmAccountantFeedItem");
      const input = params as ConfirmAccountantFeedItemInput;
      assertToolAuth(input, "billit_accountant_feed_item_confirm");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Accountant feed item confirmation");
      const result = await client.confirmAccountantFeedItem({
        accessToken: input.accessToken,
        apiKey: input.apiKey,
        partyId: input.partyId,
        feedName: input.feedName,
        feedItemId: input.feedItemId,
        remoteServerName: input.remoteServerName,
        remotePath: input.remotePath,
        idempotencyKey: input.idempotencyKey,
      });
      safeLog("billit.accountant.feed.item.confirm.success", { feedName: input.feedName });
      return redactUnknown(result);
    },

    async downloadAccountantFeedFile(params: unknown): Promise<unknown> {
      if (!validators.downloadAccountantFeedFile.Check(params)) throw validationError("downloadAccountantFeedFile");
      const input = params as DownloadAccountantFeedFileInput;
      assertToolAuth(input, "billit_accountant_feed_file_download");
      const result = await client.downloadAccountantFeedFile(input);
      safeLog("billit.accountant.feed.file.download.success", { feedName: input.feedName });
      return redactUnknown(result);
    },

    // ── Account ──────────────────────────────────────────────────────────────

    async getAccountInformation(params: unknown): Promise<unknown> {
      if (!validators.getAccountInformation.Check(params)) throw validationError("getAccountInformation");
      const input = params as GetAccountInformationInput;
      assertToolAuth(input, "billit_account_information_get");
      const result = await client.getAccountInformation(input);
      safeLog("billit.account.information.success", {});
      return redactUnknown(result);
    },

    async getSsoToken(params: unknown): Promise<unknown> {
      if (!validators.getSsoToken.Check(params)) throw validationError("getSsoToken");
      const input = params as GetSsoTokenInput;
      assertToolAuth(input, "billit_account_sso_token_get");
      const result = await client.getSsoToken(input);
      safeLog("billit.account.sso.token.success", {});
      // SSO token is a short-lived credential – redact the raw value
      return { token: "[REDACTED]", _raw: redactUnknown(result) };
    },

    async createSequence(params: unknown): Promise<unknown> {
      if (!validators.createSequence.Check(params)) throw validationError("createSequence");
      const input = params as CreateSequenceInput;
      assertToolAuth(input, "billit_account_sequence_create");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Sequence creation");
      const result = await client.createSequence({
        accessToken: input.accessToken,
        apiKey: input.apiKey,
        partyId: input.partyId,
        sequence: input.sequence,
        idempotencyKey: input.idempotencyKey,
      });
      safeLog("billit.account.sequence.create.success", {});
      return redactUnknown(result);
    },

    async registerCompany(params: unknown): Promise<unknown> {
      if (!validators.registerCompany.Check(params)) throw validationError("registerCompany");
      const input = params as RegisterCompanyInput;
      assertToolAuth(input, "billit_account_registercompany");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Company registration");
      const result = await client.registerCompany({
        accessToken: input.accessToken,
        apiKey: input.apiKey,
        partyId: input.partyId,
        company: input.company,
        idempotencyKey: input.idempotencyKey,
      });
      safeLog("billit.account.registercompany.success", {});
      return redactUnknown(result);
    },

    // ── Document ─────────────────────────────────────────────────────────────

    async listDocuments(params: unknown): Promise<unknown> {
      if (!validators.listDocuments.Check(params)) throw validationError("listDocuments");
      const input = params as ListDocumentsInput;
      assertToolAuth(input, "billit_documents_list");
      const result = await client.listDocuments(input);
      safeLog("billit.documents.list.success", {});
      return redactUnknown(result);
    },

    async createDocument(params: unknown): Promise<unknown> {
      if (!validators.createDocument.Check(params)) throw validationError("createDocument");
      const input = params as CreateDocumentInput;
      assertToolAuth(input, "billit_document_create");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Document creation");
      const result = await client.createDocument({
        accessToken: input.accessToken,
        apiKey: input.apiKey,
        partyId: input.partyId,
        document: input.document,
        idempotencyKey: input.idempotencyKey,
      });
      safeLog("billit.document.create.success", {});
      return redactUnknown(result);
    },

    async getDocument(params: unknown): Promise<unknown> {
      if (!validators.getDocument.Check(params)) throw validationError("getDocument");
      const input = params as GetDocumentInput;
      assertToolAuth(input, "billit_document_get");
      const result = await client.getDocument(input);
      safeLog("billit.document.get.success", { documentId: String(input.documentId) });
      return redactUnknown(result);
    },

    // ── Financial transactions ────────────────────────────────────────────────

    async importTransactionFile(params: unknown): Promise<unknown> {
      if (!validators.importTransactionFile.Check(params)) throw validationError("importTransactionFile");
      const input = params as ImportTransactionFileInput;
      assertToolAuth(input, "billit_financial_transaction_file_import");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Transaction file import");
      const result = await client.importTransactionFile({
        accessToken: input.accessToken,
        apiKey: input.apiKey,
        partyId: input.partyId,
        fileId: input.fileId,
        fileName: input.fileName,
        mimeType: input.mimeType,
        fileContent: input.fileContent,
        idempotencyKey: input.idempotencyKey,
      });
      safeLog("billit.financial.transaction.file.import.success", {});
      return redactUnknown(result);
    },

    async importTransactions(params: unknown): Promise<unknown> {
      if (!validators.importTransactions.Check(params)) throw validationError("importTransactions");
      const input = params as ImportTransactionsInput;
      assertToolAuth(input, "billit_financial_transactions_import");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Transactions import");
      const result = await client.importTransactions({
        accessToken: input.accessToken,
        apiKey: input.apiKey,
        partyId: input.partyId,
        transactions: input.transactions,
        idempotencyKey: input.idempotencyKey,
      });
      safeLog("billit.financial.transactions.import.success", {});
      return redactUnknown(result);
    },

    async listFinancialTransactions(params: unknown): Promise<unknown> {
      if (!validators.listFinancialTransactions.Check(params)) throw validationError("listFinancialTransactions");
      const input = params as ListFinancialTransactionsInput;
      assertToolAuth(input, "billit_financial_transactions_list");
      const result = await client.listFinancialTransactions(input);
      safeLog("billit.financial.transactions.list.success", {});
      return redactUnknown(result);
    },

    // ── GL accounts & journals ────────────────────────────────────────────────

    async createGLAccount(params: unknown): Promise<unknown> {
      if (!validators.createGLAccount.Check(params)) throw validationError("createGLAccount");
      const input = params as CreateGLAccountInput;
      assertToolAuth(input, "billit_glaccount_create");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "GL account creation");
      const result = await client.createGLAccount({
        accessToken: input.accessToken,
        apiKey: input.apiKey,
        partyId: input.partyId,
        account: input.account,
        idempotencyKey: input.idempotencyKey,
      });
      safeLog("billit.glaccount.create.success", {});
      return redactUnknown(result);
    },

    async importGLAccounts(params: unknown): Promise<unknown> {
      if (!validators.importGLAccounts.Check(params)) throw validationError("importGLAccounts");
      const input = params as ImportGLAccountsInput;
      assertToolAuth(input, "billit_glaccounts_import");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "GL accounts import");
      const result = await client.importGLAccounts({
        accessToken: input.accessToken,
        apiKey: input.apiKey,
        partyId: input.partyId,
        accounts: input.accounts,
        idempotencyKey: input.idempotencyKey,
      });
      safeLog("billit.glaccounts.import.success", {});
      return redactUnknown(result);
    },

    async importJournals(params: unknown): Promise<unknown> {
      if (!validators.importJournals.Check(params)) throw validationError("importJournals");
      const input = params as ImportJournalsInput;
      assertToolAuth(input, "billit_journals_import");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Journals import");
      const result = await client.importJournals({
        accessToken: input.accessToken,
        apiKey: input.apiKey,
        partyId: input.partyId,
        journals: input.journals,
        idempotencyKey: input.idempotencyKey,
      });
      safeLog("billit.journals.import.success", {});
      return redactUnknown(result);
    },

    // ── Products ──────────────────────────────────────────────────────────────

    async getProduct(params: unknown): Promise<unknown> {
      if (!validators.getProduct.Check(params)) throw validationError("getProduct");
      const input = params as GetProductInput;
      assertToolAuth(input, "billit_product_get");
      const result = await client.getProduct(input);
      safeLog("billit.product.get.success", { productId: String(input.productId) });
      return redactUnknown(result);
    },

    async listProducts(params: unknown): Promise<unknown> {
      if (!validators.listProducts.Check(params)) throw validationError("listProducts");
      const input = params as ListProductsInput;
      assertToolAuth(input, "billit_products_list");
      const result = await client.listProducts(input);
      safeLog("billit.products.list.success", {});
      return redactUnknown(result);
    },

    async createProduct(params: unknown): Promise<unknown> {
      if (!validators.createProduct.Check(params)) throw validationError("createProduct");
      const input = params as CreateProductInput;
      assertToolAuth(input, "billit_product_create");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Product creation");
      const result = await client.createProduct({
        accessToken: input.accessToken,
        apiKey: input.apiKey,
        partyId: input.partyId,
        product: input.product,
        idempotencyKey: input.idempotencyKey,
      });
      safeLog("billit.product.create.success", {});
      return redactUnknown(result);
    },

    // ── ToProcess ────────────────────────────────────────────────────────────

    async submitToProcess(params: unknown): Promise<unknown> {
      if (!validators.submitToProcess.Check(params)) throw validationError("submitToProcess");
      const input = params as SubmitToProcessInput;
      assertToolAuth(input, "billit_toprocess_submit");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Submit to process");
      const result = await client.submitToProcess({
        accessToken: input.accessToken,
        apiKey: input.apiKey,
        partyId: input.partyId,
        payload: input.payload,
        idempotencyKey: input.idempotencyKey,
      });
      safeLog("billit.toprocess.submit.success", {});
      return redactUnknown(result);
    },

    async deleteToProcess(params: unknown): Promise<unknown> {
      if (!validators.deleteToProcess.Check(params)) throw validationError("deleteToProcess");
      const input = params as DeleteToProcessInput;
      assertToolAuth(input, "billit_toprocess_delete");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Delete from process queue");
      const result = await client.deleteToProcess(input);
      safeLog("billit.toprocess.delete.success", { uploadId: String(input.uploadId) });
      return redactUnknown(result);
    },

    // ── Peppol ────────────────────────────────────────────────────────────────

    async registerPeppolParticipant(params: unknown): Promise<unknown> {
      if (!validators.registerPeppolParticipant.Check(params)) throw validationError("registerPeppolParticipant");
      const input = params as RegisterPeppolParticipantInput;
      assertToolAuth(input, "billit_peppol_participant_register");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Peppol participant registration");
      const result = await client.registerPeppolParticipant({
        accessToken: input.accessToken,
        apiKey: input.apiKey,
        partyId: input.partyId,
        companyId: input.companyId,
        idempotencyKey: input.idempotencyKey,
      });
      safeLog("billit.peppol.participant.register.success", {});
      return redactUnknown(result);
    },

    async deregisterPeppolParticipant(params: unknown): Promise<unknown> {
      if (!validators.deregisterPeppolParticipant.Check(params)) throw validationError("deregisterPeppolParticipant");
      const input = params as DeregisterPeppolParticipantInput;
      assertToolAuth(input, "billit_peppol_participant_deregister");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Peppol participant deregistration");
      const result = await client.deregisterPeppolParticipant(input);
      safeLog("billit.peppol.participant.deregister.success", {});
      return redactUnknown(result);
    },

    async getPeppolInbox(params: unknown): Promise<unknown> {
      if (!validators.getPeppolInbox.Check(params)) throw validationError("getPeppolInbox");
      const input = params as GetPeppolInboxInput;
      assertToolAuth(input, "billit_peppol_inbox_get");
      const result = await client.getPeppolInbox(input);
      safeLog("billit.peppol.inbox.get.success", {});
      return redactUnknown(result);
    },

    async confirmPeppolInboxItem(params: unknown): Promise<unknown> {
      if (!validators.confirmPeppolInboxItem.Check(params)) throw validationError("confirmPeppolInboxItem");
      const input = params as ConfirmPeppolInboxItemInput;
      assertToolAuth(input, "billit_peppol_inbox_item_confirm");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Peppol inbox item confirmation");
      const result = await client.confirmPeppolInboxItem({
        accessToken: input.accessToken,
        apiKey: input.apiKey,
        partyId: input.partyId,
        inboxItemId: input.inboxItemId,
        idempotencyKey: input.idempotencyKey,
      });
      safeLog("billit.peppol.inbox.item.confirm.success", {});
      return redactUnknown(result);
    },

    async refusePeppolInboxItem(params: unknown): Promise<unknown> {
      if (!validators.refusePeppolInboxItem.Check(params)) throw validationError("refusePeppolInboxItem");
      const input = params as RefusePeppolInboxItemInput;
      assertToolAuth(input, "billit_peppol_inbox_item_refuse");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Peppol inbox item refusal");
      const result = await client.refusePeppolInboxItem({
        accessToken: input.accessToken,
        apiKey: input.apiKey,
        partyId: input.partyId,
        inboxItemId: input.inboxItemId,
        idempotencyKey: input.idempotencyKey,
      });
      safeLog("billit.peppol.inbox.item.refuse.success", {});
      return redactUnknown(result);
    },

    async sendPeppolOrder(params: unknown): Promise<unknown> {
      if (!validators.sendPeppolOrder.Check(params)) throw validationError("sendPeppolOrder");
      const input = params as SendPeppolOrderInput;
      assertToolAuth(input, "billit_peppol_order_send");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Peppol order send");
      const result = await client.sendPeppolOrder({
        accessToken: input.accessToken,
        apiKey: input.apiKey,
        partyId: input.partyId,
        order: input.order,
        idempotencyKey: input.idempotencyKey,
      });
      safeLog("billit.peppol.order.send.success", {});
      return redactUnknown(result);
    },

    async getPeppolParticipantInfo(params: unknown): Promise<unknown> {
      if (!validators.getPeppolParticipantInfo.Check(params)) throw validationError("getPeppolParticipantInfo");
      const input = params as GetPeppolParticipantInfoInput;
      assertToolAuth(input, "billit_peppol_participant_info_get");
      const result = await client.getPeppolParticipantInfo(input);
      safeLog("billit.peppol.participant.info.success", {});
      return redactUnknown(result);
    },

    // ── Misc ──────────────────────────────────────────────────────────────────

    async companySearch(params: unknown): Promise<unknown> {
      if (!validators.companySearch.Check(params)) throw validationError("companySearch");
      const input = params as CompanySearchInput;
      assertToolAuth(input, "billit_misc_company_search");
      const result = await client.companySearch(input);
      safeLog("billit.misc.company.search.success", {});
      return redactUnknown(result);
    },

    async getTypeCodes(params: unknown): Promise<unknown> {
      if (!validators.getTypeCodes.Check(params)) throw validationError("getTypeCodes");
      const input = params as GetTypeCodesInput;
      assertToolAuth(input, "billit_misc_typecodes_list");
      const result = await client.getTypeCodes(input);
      safeLog("billit.misc.typecodes.list.success", { typeCodeType: input.typeCodeType });
      return redactUnknown(result);
    },

    async getTypeCode(params: unknown): Promise<unknown> {
      if (!validators.getTypeCode.Check(params)) throw validationError("getTypeCode");
      const input = params as GetTypeCodeInput;
      assertToolAuth(input, "billit_misc_typecode_get");
      const result = await client.getTypeCode(input);
      safeLog("billit.misc.typecode.get.success", { typeCodeType: input.typeCodeType, key: input.key });
      return redactUnknown(result);
    },

    // ── OAuth2 ────────────────────────────────────────────────────────────────

    async oauthRevoke(params: unknown): Promise<unknown> {
      if (!validators.oauthRevoke.Check(params)) throw validationError("oauthRevoke");
      const result = await client.revokeToken();
      safeLog("billit.oauth.revoke.success", {});
      return redactUnknown(result);
    },

    // ── Reports ───────────────────────────────────────────────────────────────

    async listReports(params: unknown): Promise<unknown> {
      if (!validators.listReports.Check(params)) throw validationError("listReports");
      const input = params as ListReportsInput;
      assertToolAuth(input, "billit_reports_list");
      const result = await client.listReports(input);
      safeLog("billit.reports.list.success", {});
      return redactUnknown(result);
    },

    async getReport(params: unknown): Promise<unknown> {
      if (!validators.getReport.Check(params)) throw validationError("getReport");
      const input = params as GetReportInput;
      assertToolAuth(input, "billit_report_get");
      const result = await client.getReport(input);
      safeLog("billit.report.get.success", { reportId: String(input.reportId) });
      return redactUnknown(result);
    },

    // ── Webhook management ────────────────────────────────────────────────────

    async createWebhook(params: unknown): Promise<unknown> {
      if (!validators.createWebhook.Check(params)) throw validationError("createWebhook");
      const input = params as CreateWebhookInput;
      assertToolAuth(input, "billit_webhook_create");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Webhook creation");
      const result = await client.createWebhook({
        accessToken: input.accessToken,
        apiKey: input.apiKey,
        partyId: input.partyId,
        entityType: input.entityType,
        entityUpdateType: input.entityUpdateType,
        webhookUrl: input.webhookUrl,
        idempotencyKey: input.idempotencyKey,
      });
      safeLog("billit.webhook.create.success", {});
      return redactUnknown(result);
    },

    async listWebhooks(params: unknown): Promise<unknown> {
      if (!validators.listWebhooks.Check(params)) throw validationError("listWebhooks");
      const input = params as ListWebhooksInput;
      assertToolAuth(input, "billit_webhooks_list");
      const result = await client.listWebhooks(input);
      safeLog("billit.webhooks.list.success", {});
      return redactUnknown(result);
    },

    async deleteWebhook(params: unknown): Promise<unknown> {
      if (!validators.deleteWebhook.Check(params)) throw validationError("deleteWebhook");
      const input = params as DeleteWebhookInput;
      assertToolAuth(input, "billit_webhook_delete");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Webhook deletion");
      const result = await client.deleteWebhook(input);
      safeLog("billit.webhook.delete.success", { webhookId: String(input.webhookId) });
      return redactUnknown(result);
    },

    async refreshWebhook(params: unknown): Promise<unknown> {
      if (!validators.refreshWebhook.Check(params)) throw validationError("refreshWebhook");
      const input = params as RefreshWebhookInput;
      assertToolAuth(input, "billit_webhook_refresh");
      humanGate(options.allowStateChangingOperations, input.requireHumanApproval, "Webhook refresh");
      const result = await client.refreshWebhook({
        accessToken: input.accessToken,
        apiKey: input.apiKey,
        partyId: input.partyId,
        webhookId: input.webhookId,
        idempotencyKey: input.idempotencyKey,
      });
      safeLog("billit.webhook.refresh.success", { webhookId: String(input.webhookId) });
      return redactUnknown(result);
    },
  };
}
