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
