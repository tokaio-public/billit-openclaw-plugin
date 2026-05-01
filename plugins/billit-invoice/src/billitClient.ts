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
  method: "GET" | "POST";
  path: string;
  body?: unknown;
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
    });

    const obj = result as Partial<BillitAuthTokens>;
    if (!obj.access_token || !obj.refresh_token || !obj.expires_in) {
      throw new BillitValidationError("Billit token response is incomplete");
    }
    return obj as BillitAuthTokens;
  }

  private async request(args: RequestArgs): Promise<unknown> {
    this.assertAuthInput(args);

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
