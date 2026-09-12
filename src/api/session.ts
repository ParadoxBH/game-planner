/**
 * Contas autenticadas neste navegador.
 *
 * Guarda mais de uma conta de propósito: alternar entre um platform_admin e um
 * usuário comum sem digitar senha a cada troca é o que torna viável testar pela
 * interface as permissões do backend.
 *
 * Os tokens ficam no localStorage. Front e API rodam em origens diferentes, e
 * navegadores bloqueiam cookie de terceiros, então cookie httpOnly não serve aqui.
 */

export interface StoredAccount {
  username: string;
  accessToken: string;
  refreshToken: string;
}

export interface SessionState {
  activeUsername: string | null;
  accounts: StoredAccount[];
}

type Tokens = Pick<StoredAccount, "accessToken" | "refreshToken">;

const STORAGE_KEY = "gp_session";
const EMPTY: SessionState = { activeUsername: null, accounts: [] };

let state: SessionState = read();
const listeners = new Set<() => void>();

function read(): SessionState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as SessionState;
    return Array.isArray(parsed.accounts) ? parsed : EMPTY;
  } catch {
    return EMPTY;
  }
}

function commit(next: SessionState) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Armazenamento indisponível (aba anônima, cota): a sessão vale só até recarregar.
  }
  listeners.forEach((listener) => listener());
}

// Outra aba entrou, saiu ou trocou de conta.
window.addEventListener("storage", (event) => {
  if (event.key !== STORAGE_KEY) return;
  state = read();
  listeners.forEach((listener) => listener());
});

export const session = {
  /** Referência estável enquanto nada muda — exigência do useSyncExternalStore. */
  getState(): SessionState {
    return state;
  },

  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },

  active(): StoredAccount | null {
    return state.accounts.find((account) => account.username === state.activeUsername) ?? null;
  },

  /** Adiciona (ou substitui) a conta e a torna ativa. As demais continuam guardadas. */
  signIn(username: string, tokens: Tokens) {
    const others = state.accounts.filter((account) => account.username !== username);
    commit({
      activeUsername: username,
      accounts: [...others, { username, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }],
    });
  },

  updateTokens(username: string, tokens: Tokens) {
    if (!state.accounts.some((account) => account.username === username)) return;
    commit({
      ...state,
      accounts: state.accounts.map((account) =>
        account.username === username
          ? { username, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken }
          : account,
      ),
    });
  },

  switchTo(username: string) {
    if (!state.accounts.some((account) => account.username === username)) return;
    commit({ ...state, activeUsername: username });
  },

  /** Esquece a conta. Se era a ativa, fica deslogado — não pula para outra sozinho. */
  signOut(username: string) {
    commit({
      activeUsername: state.activeUsername === username ? null : state.activeUsername,
      accounts: state.accounts.filter((account) => account.username !== username),
    });
  },
};
