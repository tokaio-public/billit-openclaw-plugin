import { redactUnknown } from "./redaction.js";

export function safeLog(event: string, payload: Record<string, unknown>): void {
  const redacted = redactUnknown(payload);
  // Keep logs machine-readable and avoid invoice payload leakage.
  console.info(JSON.stringify({ event, payload: redacted }));
}
