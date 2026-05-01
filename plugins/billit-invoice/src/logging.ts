import { redactUnknown } from "./redaction.js";

type SafeLogPayload = Record<string, unknown> & {
  correlationId?: unknown;
  idempotencyKey?: unknown;
};

function deriveCorrelationId(payload: SafeLogPayload): string | undefined {
  if (typeof payload.correlationId === "string" && payload.correlationId.length > 0) {
    return payload.correlationId;
  }
  if (typeof payload.idempotencyKey === "string" && payload.idempotencyKey.length > 0) {
    return payload.idempotencyKey;
  }
  return undefined;
}

export function safeLog(event: string, payload: SafeLogPayload): void {
  const redacted = redactUnknown(payload);
  const correlationId = deriveCorrelationId(payload);
  // Keep logs machine-readable and avoid invoice payload leakage.
  console.info(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      event,
      correlationId,
      payload: redacted,
    }),
  );
}
