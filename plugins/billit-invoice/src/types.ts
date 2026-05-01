export type RetryConfig = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
};

export type PluginConfig = {
  apiBaseUrl: string;
  timeoutMs: number;
  allowStateChangingOperations: boolean;
  retries: RetryConfig;
};

export type BillitAuthInput = {
  accessToken?: string;
  apiKey?: string;
};

export type BillitAuthTokens = {
  token_type: "Bearer" | string;
  expires_in: number;
  access_token: string;
  refresh_token: string;
};

export type InvoiceSummary = {
  OrderID: number | string;
  OrderNumber?: string;
  OrderType?: string;
  OrderDirection?: string;
  TotalIncl?: number;
  Currency?: string;
  OrderStatus?: string;
  IsSent?: boolean;
  Paid?: boolean;
};

export type ListInvoicesResult = {
  Items: InvoiceSummary[];
};
