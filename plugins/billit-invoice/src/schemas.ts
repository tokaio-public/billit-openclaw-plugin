import { Type } from "@sinclair/typebox";

export const OAuthExchangeSchema = Type.Object(
  {
    code: Type.String({ minLength: 1 }),
    clientId: Type.String({ minLength: 1 }),
    clientSecret: Type.String({ minLength: 1 }),
    redirectUri: Type.String({ minLength: 1, pattern: "^https://" }),
  },
  { additionalProperties: false },
);

export const OAuthRefreshSchema = Type.Object(
  {
    refreshToken: Type.String({ minLength: 1 }),
    clientId: Type.String({ minLength: 1 }),
    clientSecret: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const ListInvoicesSchema = Type.Object(
  {
    accessToken: Type.Optional(Type.String({ minLength: 1 })),
    apiKey: Type.Optional(Type.String({ minLength: 1 })),
    partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
    odataFilter: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const GetInvoiceSchema = Type.Object(
  {
    accessToken: Type.Optional(Type.String({ minLength: 1 })),
    apiKey: Type.Optional(Type.String({ minLength: 1 })),
    orderId: Type.Union([Type.String(), Type.Number()]),
    partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
  },
  { additionalProperties: false },
);

export const CreateInvoiceSchema = Type.Object(
  {
    accessToken: Type.Optional(Type.String({ minLength: 1 })),
    apiKey: Type.Optional(Type.String({ minLength: 1 })),
    invoice: Type.Record(Type.String(), Type.Any()),
    idempotencyKey: Type.String({ minLength: 8, maxLength: 255 }),
    partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

export const SendInvoiceSchema = Type.Object(
  {
    accessToken: Type.Optional(Type.String({ minLength: 1 })),
    apiKey: Type.Optional(Type.String({ minLength: 1 })),
    transportType: Type.String({ minLength: 1, maxLength: 64 }),
    orderIds: Type.Array(Type.Union([Type.String(), Type.Number()]), { minItems: 1 }),
    strictTransportType: Type.Optional(Type.Boolean()),
    partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

export const VerifyWebhookSchema = Type.Object(
  {
    signatureHeader: Type.String({ minLength: 1 }),
    payload: Type.String({ minLength: 1 }),
    secret: Type.String({ minLength: 1 }),
    toleranceSeconds: Type.Optional(Type.Number({ minimum: 1, maximum: 3600, default: 300 })),
  },
  { additionalProperties: false },
);

// ── Order extensions ────────────────────────────────────────────────────────

const AuthFields = {
  accessToken: Type.Optional(Type.String({ minLength: 1 })),
  apiKey: Type.Optional(Type.String({ minLength: 1 })),
  partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
};

export const PatchOrderSchema = Type.Object(
  {
    ...AuthFields,
    orderId: Type.Union([Type.String(), Type.Number()]),
    updates: Type.Record(Type.String(), Type.Any()),
    idempotencyKey: Type.String({ minLength: 8, maxLength: 255 }),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

export const DeleteOrderSchema = Type.Object(
  {
    ...AuthFields,
    orderId: Type.Union([Type.String(), Type.Number()]),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

export const AddOrderPaymentSchema = Type.Object(
  {
    ...AuthFields,
    orderId: Type.Union([Type.String(), Type.Number()]),
    amount: Type.Optional(Type.Number()),
    description: Type.Optional(Type.String()),
    date: Type.Optional(Type.String()),
    idempotencyKey: Type.String({ minLength: 8, maxLength: 255 }),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

export const GetDeletedOrdersSchema = Type.Object(
  { ...AuthFields },
  { additionalProperties: false },
);

export const PutOrderBookingEntriesSchema = Type.Object(
  {
    ...AuthFields,
    orderId: Type.Union([Type.String(), Type.Number()]),
    entries: Type.Array(Type.Record(Type.String(), Type.Any())),
    idempotencyKey: Type.String({ minLength: 8, maxLength: 255 }),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

// ── Party ────────────────────────────────────────────────────────────────────

export const ListPartiesSchema = Type.Object(
  {
    ...AuthFields,
    fullTextSearch: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const CreatePartySchema = Type.Object(
  {
    ...AuthFields,
    party: Type.Record(Type.String(), Type.Any()),
    idempotencyKey: Type.String({ minLength: 8, maxLength: 255 }),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

export const GetPartySchema = Type.Object(
  {
    ...AuthFields,
    targetPartyId: Type.Union([Type.String(), Type.Number()]),
  },
  { additionalProperties: false },
);

export const PatchPartySchema = Type.Object(
  {
    ...AuthFields,
    targetPartyId: Type.Union([Type.String(), Type.Number()]),
    updates: Type.Record(Type.String(), Type.Any()),
    idempotencyKey: Type.String({ minLength: 8, maxLength: 255 }),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

// ── File ──────────────────────────────────────────────────────────────────────

export const GetFileSchema = Type.Object(
  {
    ...AuthFields,
    fileId: Type.Union([Type.String(), Type.Number()]),
  },
  { additionalProperties: false },
);

// ── Accountant feeds ─────────────────────────────────────────────────────────

export const GetAccountantFeedsSchema = Type.Object(
  { ...AuthFields },
  { additionalProperties: false },
);

export const CreateAccountantFeedSchema = Type.Object(
  {
    ...AuthFields,
    name: Type.String({ minLength: 1 }),
    idempotencyKey: Type.String({ minLength: 8, maxLength: 255 }),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

export const GetAccountantFeedIndexSchema = Type.Object(
  {
    ...AuthFields,
    feedName: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const DeleteAccountantFeedSchema = Type.Object(
  {
    ...AuthFields,
    feedName: Type.String({ minLength: 1 }),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

export const ConfirmAccountantFeedItemSchema = Type.Object(
  {
    ...AuthFields,
    feedName: Type.String({ minLength: 1 }),
    feedItemId: Type.Union([Type.String(), Type.Number()]),
    remoteServerName: Type.Optional(Type.String()),
    remotePath: Type.Optional(Type.String()),
    idempotencyKey: Type.String({ minLength: 8, maxLength: 255 }),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

export const DownloadAccountantFeedFileSchema = Type.Object(
  {
    ...AuthFields,
    feedName: Type.String({ minLength: 1 }),
    feedItemId: Type.Union([Type.String(), Type.Number()]),
  },
  { additionalProperties: false },
);

// ── Account ──────────────────────────────────────────────────────────────────

export const GetAccountInformationSchema = Type.Object(
  { ...AuthFields },
  { additionalProperties: false },
);

export const GetSsoTokenSchema = Type.Object(
  { ...AuthFields },
  { additionalProperties: false },
);

export const CreateSequenceSchema = Type.Object(
  {
    ...AuthFields,
    sequence: Type.Record(Type.String(), Type.Any()),
    idempotencyKey: Type.String({ minLength: 8, maxLength: 255 }),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

export const RegisterCompanySchema = Type.Object(
  {
    ...AuthFields,
    company: Type.Record(Type.String(), Type.Any()),
    idempotencyKey: Type.String({ minLength: 8, maxLength: 255 }),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

// ── Document ─────────────────────────────────────────────────────────────────

export const ListDocumentsSchema = Type.Object(
  {
    ...AuthFields,
    odataFilter: Type.Optional(Type.String()),
  },
  { additionalProperties: false },
);

export const CreateDocumentSchema = Type.Object(
  {
    ...AuthFields,
    document: Type.Record(Type.String(), Type.Any()),
    idempotencyKey: Type.String({ minLength: 8, maxLength: 255 }),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

export const GetDocumentSchema = Type.Object(
  {
    ...AuthFields,
    documentId: Type.Union([Type.String(), Type.Number()]),
  },
  { additionalProperties: false },
);

// ── Financial transactions ────────────────────────────────────────────────────

export const ImportTransactionFileSchema = Type.Object(
  {
    ...AuthFields,
    fileId: Type.Optional(Type.String()),
    fileName: Type.Optional(Type.String()),
    mimeType: Type.Optional(Type.String()),
    fileContent: Type.Optional(Type.String()),
    idempotencyKey: Type.String({ minLength: 8, maxLength: 255 }),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

export const ImportTransactionsSchema = Type.Object(
  {
    ...AuthFields,
    transactions: Type.Record(Type.String(), Type.Any()),
    idempotencyKey: Type.String({ minLength: 8, maxLength: 255 }),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

export const ListFinancialTransactionsSchema = Type.Object(
  { ...AuthFields },
  { additionalProperties: false },
);

// ── GL accounts & journals ────────────────────────────────────────────────────

export const CreateGLAccountSchema = Type.Object(
  {
    ...AuthFields,
    account: Type.Record(Type.String(), Type.Any()),
    idempotencyKey: Type.String({ minLength: 8, maxLength: 255 }),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

export const ImportGLAccountsSchema = Type.Object(
  {
    ...AuthFields,
    accounts: Type.Array(Type.Record(Type.String(), Type.Any())),
    idempotencyKey: Type.String({ minLength: 8, maxLength: 255 }),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

export const ImportJournalsSchema = Type.Object(
  {
    ...AuthFields,
    journals: Type.Array(Type.Record(Type.String(), Type.Any())),
    idempotencyKey: Type.String({ minLength: 8, maxLength: 255 }),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

// ── Products ──────────────────────────────────────────────────────────────────

export const GetProductSchema = Type.Object(
  {
    ...AuthFields,
    productId: Type.Union([Type.String(), Type.Number()]),
  },
  { additionalProperties: false },
);

export const ListProductsSchema = Type.Object(
  { ...AuthFields },
  { additionalProperties: false },
);

export const CreateProductSchema = Type.Object(
  {
    ...AuthFields,
    product: Type.Record(Type.String(), Type.Any()),
    idempotencyKey: Type.String({ minLength: 8, maxLength: 255 }),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

// ── ToProcess ────────────────────────────────────────────────────────────────

export const SubmitToProcessSchema = Type.Object(
  {
    ...AuthFields,
    payload: Type.Record(Type.String(), Type.Any()),
    idempotencyKey: Type.String({ minLength: 8, maxLength: 255 }),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

export const DeleteToProcessSchema = Type.Object(
  {
    ...AuthFields,
    uploadId: Type.Union([Type.String(), Type.Number()]),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

// ── Peppol ────────────────────────────────────────────────────────────────────

export const RegisterPeppolParticipantSchema = Type.Object(
  {
    ...AuthFields,
    companyId: Type.String({ minLength: 1 }),
    idempotencyKey: Type.String({ minLength: 8, maxLength: 255 }),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

export const DeregisterPeppolParticipantSchema = Type.Object(
  {
    ...AuthFields,
    companyId: Type.String({ minLength: 1 }),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

export const GetPeppolInboxSchema = Type.Object(
  { ...AuthFields },
  { additionalProperties: false },
);

export const ConfirmPeppolInboxItemSchema = Type.Object(
  {
    ...AuthFields,
    inboxItemId: Type.Union([Type.String(), Type.Number()]),
    idempotencyKey: Type.String({ minLength: 8, maxLength: 255 }),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

export const RefusePeppolInboxItemSchema = Type.Object(
  {
    ...AuthFields,
    inboxItemId: Type.Union([Type.String(), Type.Number()]),
    idempotencyKey: Type.String({ minLength: 8, maxLength: 255 }),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

export const SendPeppolOrderSchema = Type.Object(
  {
    ...AuthFields,
    order: Type.Record(Type.String(), Type.Any()),
    idempotencyKey: Type.String({ minLength: 8, maxLength: 255 }),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

export const GetPeppolParticipantInfoSchema = Type.Object(
  {
    ...AuthFields,
    vatOrCbe: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

// ── Misc ──────────────────────────────────────────────────────────────────────

export const CompanySearchSchema = Type.Object(
  {
    ...AuthFields,
    keywords: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const GetTypeCodesSchema = Type.Object(
  {
    ...AuthFields,
    typeCodeType: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

export const GetTypeCodeSchema = Type.Object(
  {
    ...AuthFields,
    typeCodeType: Type.String({ minLength: 1 }),
    key: Type.String({ minLength: 1 }),
  },
  { additionalProperties: false },
);

// ── OAuth2 ────────────────────────────────────────────────────────────────────

export const OAuthRevokeSchema = Type.Object(
  {},
  { additionalProperties: false },
);

// ── Reports ───────────────────────────────────────────────────────────────────

export const ListReportsSchema = Type.Object(
  { ...AuthFields },
  { additionalProperties: false },
);

export const GetReportSchema = Type.Object(
  {
    ...AuthFields,
    reportId: Type.Union([Type.String(), Type.Number()]),
  },
  { additionalProperties: false },
);

// ── Webhook management ────────────────────────────────────────────────────────

export const CreateWebhookSchema = Type.Object(
  {
    ...AuthFields,
    entityType: Type.String({ minLength: 1 }),
    entityUpdateType: Type.String({ minLength: 1 }),
    webhookUrl: Type.String({ minLength: 1, pattern: "^https://" }),
    idempotencyKey: Type.String({ minLength: 8, maxLength: 255 }),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

export const ListWebhooksSchema = Type.Object(
  { ...AuthFields },
  { additionalProperties: false },
);

export const DeleteWebhookSchema = Type.Object(
  {
    ...AuthFields,
    webhookId: Type.Union([Type.String(), Type.Number()]),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);

export const RefreshWebhookSchema = Type.Object(
  {
    ...AuthFields,
    webhookId: Type.Union([Type.String(), Type.Number()]),
    idempotencyKey: Type.String({ minLength: 8, maxLength: 255 }),
    requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
  },
  { additionalProperties: false },
);
