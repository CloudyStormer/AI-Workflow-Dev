export class PolicyRegistryError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "PolicyRegistryError";
    this.code = code;
    this.details = Object.freeze({ ...details });
  }
}
