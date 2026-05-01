import { Type } from "@sinclair/typebox";

export const OAuthExchangeSchema = Type.Object({
  code: Type.String({ minLength: 1 }),
  clientId: Type.String({ minLength: 1 }),
  clientSecret: Type.String({ minLength: 1 }),
  redirectUri: Type.String({ minLength: 1 }),
});

export const OAuthRefreshSchema = Type.Object({
  refreshToken: Type.String({ minLength: 1 }),
  clientId: Type.String({ minLength: 1 }),
  clientSecret: Type.String({ minLength: 1 }),
});

export const ListInvoicesSchema = Type.Object({
  accessToken: Type.String({ minLength: 1 }),
  partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
  odataFilter: Type.Optional(Type.String()),
});

export const GetInvoiceSchema = Type.Object({
  accessToken: Type.String({ minLength: 1 }),
  orderId: Type.Union([Type.String(), Type.Number()]),
  partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
});

export const CreateInvoiceSchema = Type.Object({
  accessToken: Type.String({ minLength: 1 }),
  invoice: Type.Record(Type.String(), Type.Any()),
  idempotencyKey: Type.String({ minLength: 8 }),
  partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
  requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
});

export const SendInvoiceSchema = Type.Object({
  accessToken: Type.String({ minLength: 1 }),
  transportType: Type.String({ minLength: 1 }),
  orderIds: Type.Array(Type.Union([Type.String(), Type.Number()]), { minItems: 1 }),
  strictTransportType: Type.Optional(Type.Boolean()),
  partyId: Type.Optional(Type.Union([Type.String(), Type.Number()])),
  requireHumanApproval: Type.Optional(Type.Boolean({ default: true })),
});

export const VerifyWebhookSchema = Type.Object({
  signatureHeader: Type.String({ minLength: 1 }),
  payload: Type.String({ minLength: 1 }),
  secret: Type.String({ minLength: 1 }),
  toleranceSeconds: Type.Optional(Type.Number({ minimum: 1, maximum: 3600, default: 300 })),
});
