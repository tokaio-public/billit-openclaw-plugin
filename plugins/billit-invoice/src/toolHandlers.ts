import { createHash, randomUUID } from "node:crypto";
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
} from "./schemas.js";
import { redactUnknown } from "./redaction.js";
import type { BillitClient } from "./billitClient.js";

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

function humanGate(requireHumanApproval: boolean | undefined, operation: string): void {
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

export function createHandlers(client: BillitClient) {
  return {
    async oauthExchange(params: unknown): Promise<unknown> {
      if (!validators.oauthExchange.Check(params)) throw validationError("oauthExchange");
      try {
        const result = await client.exchangeCode(params);
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
      try {
        const result = await client.refreshToken(params);
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
      const result = await client.listInvoices(params);
      safeLog("billit.invoices.list.success", { itemCount: result.Items?.length ?? 0 });
      return redactUnknown(result);
    },

    async getInvoice(params: unknown): Promise<unknown> {
      if (!validators.getInvoice.Check(params)) throw validationError("getInvoice");
      const result = await client.getInvoice(params);
      safeLog("billit.invoice.get.success", { orderId: String(params.orderId) });
      return redactUnknown(result);
    },

    async createInvoice(params: unknown): Promise<unknown> {
      if (!validators.createInvoice.Check(params)) throw validationError("createInvoice");
      humanGate(params.requireHumanApproval, "Invoice creation");
      const idempotencyKey = params.idempotencyKey || randomUUID();
      const result = await client.createInvoice({
        accessToken: params.accessToken,
        partyId: params.partyId,
        invoice: params.invoice,
        idempotencyKey,
      });
      safeLog("billit.invoice.create.success", { idempotencyKey });
      return redactUnknown(result);
    },

    async sendInvoice(params: unknown): Promise<unknown> {
      if (!validators.sendInvoice.Check(params)) throw validationError("sendInvoice");
      humanGate(params.requireHumanApproval, "Invoice sending");
      const idempotencyKey = randomUUID();
      const result = await client.sendInvoices({
        accessToken: params.accessToken,
        partyId: params.partyId,
        orderIds: params.orderIds,
        transportType: params.transportType,
        strictTransportType: params.strictTransportType,
        idempotencyKey,
      });
      safeLog("billit.invoice.send.success", {
        transportType: params.transportType,
        orderCount: params.orderIds.length,
        idempotencyKey,
      });
      return redactUnknown(result);
    },

    verifyWebhook(params: unknown): unknown {
      if (!validators.verifyWebhook.Check(params)) throw validationError("verifyWebhook");
      const verification = client.verifyWebhookSignature({
        signatureHeader: params.signatureHeader,
        payload: params.payload,
        secret: params.secret,
        toleranceSeconds: params.toleranceSeconds ?? 300,
      });
      safeLog("billit.webhook.verify", { valid: verification.valid, reason: verification.reason });
      return verification;
    },
  };
}
