/**
 * Erro vindo da API. O backend responde todo erro como ProblemDetail (RFC 9457),
 * e o `type` identifica a categoria de forma estável, ex.: ".../errors/validation".
 */
export class ApiError extends Error {
  readonly status: number;
  readonly type: string;
  /** Erros por campo, presentes quando o backend rejeita a validação do formulário. */
  readonly fields: Record<string, string>;

  constructor(status: number, type: string, message: string, fields: Record<string, string> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.type = type;
    this.fields = fields;
  }

  /** Categoria sem o prefixo da URL: "validation", "unauthorized", "conflict"... */
  get kind(): string {
    return this.type.split("/").pop() ?? "";
  }

  /** A requisição nem chegou ao backend: servidor desligado, CORS ou sem rede. */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}
