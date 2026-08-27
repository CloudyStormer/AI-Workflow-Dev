export class HttpContractError extends Error {
  public constructor(
    readonly code: string,
    message: string,
    readonly statusCode: number,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "HttpContractError";
  }
}
