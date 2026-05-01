const TOKEN_PATTERN = /(Bearer\s+)[A-Za-z0-9._-]+/gi;
const API_KEY_PATTERN = /(ApiKey\s*[:=]\s*)[^\s]+/gi;
const SECRET_NAME_PATTERN = /(BILLIT_[A-Z_]+)/g;

export function redactText(input: string): string {
  return input
    .replace(TOKEN_PATTERN, "$1[REDACTED]")
    .replace(API_KEY_PATTERN, "$1[REDACTED]")
    .replace(SECRET_NAME_PATTERN, "$1");
}

export function redactUnknown(input: unknown): unknown {
  if (typeof input === "string") {
    return redactText(input);
  }
  if (Array.isArray(input)) {
    return input.map(redactUnknown);
  }
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(input)) {
      if (/token|secret|authorization|apikey|signature/i.test(key)) {
        out[key] = "[REDACTED]";
      } else {
        out[key] = redactUnknown(value);
      }
    }
    return out;
  }
  return input;
}
