export class BillitHttpError extends Error {
  public readonly status: number;
  public readonly body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = "BillitHttpError";
    this.status = status;
    this.body = body;
  }
}

export class BillitValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BillitValidationError";
  }
}
