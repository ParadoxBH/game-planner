import { API_BASE_URL } from "./config";
import { ApiError } from "./ApiError";
import { session } from "./session";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface RequestOptions {
  method?: Method;
  body?: unknown;
  /** false nas rotas que não levam token, como login e cadastro. */
  authenticated?: boolean;
  signal?: AbortSignal;
}

/**
 * Toda chamada ao backend passa por aqui: injeta o token da conta ativa,
 * renova o token quando expira e converte erro em ApiError.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { authenticated = true } = options;
  const account = authenticated ? session.active() : null;

  let response = await send(path, options, account?.accessToken);

  // O access token dura 30 minutos. Na primeira recusa, renova e repete uma vez.
  // Se a renovação falhar, repete sem token: rota pública ainda responde, e rota
  // protegida devolve o 401 que a tela precisa ver.
  if (response.status === 401 && account) {
    const renewedToken = await refresh(account.username);
    response = await send(path, options, renewedToken ?? undefined);
  }

  return parse<T>(response);
}

async function send(path: string, options: RequestOptions, token?: string): Promise<Response> {
  const { method = "GET", body, signal } = options;

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    // Upload: o navegador monta o Content-Type com o boundary do multipart. Não sobrescrever.
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: payload,
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, "network", "Não foi possível conectar à API. O backend está rodando?");
  }
}

// Várias requisições podem receber 401 ao mesmo tempo quando o token vence.
// Todas esperam a mesma renovação em vez de gastar o refresh token em paralelo.
const pendingRefresh = new Map<string, Promise<string | null>>();

function refresh(username: string): Promise<string | null> {
  let pending = pendingRefresh.get(username);
  if (!pending) {
    pending = renew(username).finally(() => pendingRefresh.delete(username));
    pendingRefresh.set(username, pending);
  }
  return pending;
}

async function renew(username: string): Promise<string | null> {
  const account = session.getState().accounts.find((stored) => stored.username === username);
  if (!account) return null;

  let response: Response;
  try {
    response = await send("/auth/refresh", { method: "POST", body: { refreshToken: account.refreshToken } });
  } catch {
    // Sem rede: mantém a conta, a próxima requisição tenta de novo.
    return null;
  }

  if (response.status === 401 || response.status === 403) {
    // Refresh vencido (30 dias) ou conta suspensa: essa sessão acabou.
    session.signOut(username);
    return null;
  }
  if (!response.ok) return null;

  const tokens = (await response.json()) as { accessToken: string; refreshToken: string };
  session.updateTokens(username, tokens);
  return tokens.accessToken;
}

async function parse<T>(response: Response): Promise<T> {
  if (response.ok) {
    if (response.status === 204) return undefined as unknown as T;
    return (await response.json()) as T;
  }
  throw await toApiError(response);
}

async function toApiError(response: Response): Promise<ApiError> {
  try {
    const problem = (await response.json()) as {
      type?: string;
      title?: string;
      detail?: string;
      fields?: Record<string, string>;
    };
    return new ApiError(
      response.status,
      problem.type ?? "",
      problem.detail ?? problem.title ?? `Erro ${response.status}`,
      problem.fields ?? {},
    );
  } catch {
    return new ApiError(response.status, "", `Erro ${response.status}`);
  }
}
