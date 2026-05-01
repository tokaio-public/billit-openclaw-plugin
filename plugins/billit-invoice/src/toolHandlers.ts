import { createHash, randomUUID } from "node:crypto";
import type { Static } from "@sinclair/typebox";
import { TypeCompiler } from "@sinclair/typebox/compiler";
import { BillitHttpError, BillitValidationError } from "./errors.js";
import { safeLog } from "./logging.js";
import {
  CreateInvoiceSchema,
  GetInvoiceSchema,
  ListInvoicesSchema,
  OAuthExchangeSchema,
  OAuthRefreshSchema,
  SendInvoiceSchema,
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
  };
}
