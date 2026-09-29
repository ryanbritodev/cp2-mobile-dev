export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** IDs aceitos: chaves do Firebase (letras, números, "-" e "_"). Evita caminhos arbitrários. */
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

export function assertValidId(value: unknown, field: string): string {
  if (typeof value !== 'string' || !ID_PATTERN.test(value)) {
    throw new HttpError(400, `Campo "${field}" inválido.`);
  }
  return value;
}
