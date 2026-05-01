declare module "@sinclair/typebox" {
  export const Type: {
    Any(): unknown;
    Array(type: unknown, options?: Record<string, unknown>): unknown;
    Boolean(options?: Record<string, unknown>): unknown;
    Intersect(types: unknown[]): unknown;
    Number(options?: Record<string, unknown>): unknown;
    Object(
      props: Record<string, unknown>,
      options?: Record<string, unknown>,
    ): unknown;
    Optional(type: unknown): unknown;
    Record(key: unknown, value: unknown): unknown;
    String(options?: Record<string, unknown>): unknown;
    Union(types: unknown[]): unknown;
  };

  export type Static<T> = any;
}

declare module "@sinclair/typebox/compiler" {
  export const TypeCompiler: {
    Compile(schema: unknown): {
      Check(value: unknown): boolean;
    };
  };
}

declare module "openclaw/plugin-sdk/plugin-entry" {
  export function definePluginEntry<T>(entry: T): T;
}

declare module "./schemas.js" {
  export const OAuthExchangeSchema: unknown;
  export const OAuthRefreshSchema: unknown;
  export const ListInvoicesSchema: unknown;
  export const GetInvoiceSchema: unknown;
  export const CreateInvoiceSchema: unknown;
  export const SendInvoiceSchema: unknown;
  export const VerifyWebhookSchema: unknown;
}
