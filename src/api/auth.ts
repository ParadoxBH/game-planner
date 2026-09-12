import { apiRequest } from "./http";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
}

export type GameRoleCode = "owner" | "moderator" | "editor";

export interface Me {
  username: string;
  displayName: string;
  /** A flag "autenticado": conta com vínculo, pode editar jogo comunitário. */
  verified: boolean;
  status: "active" | "suspended";
  platformAdmin: boolean;
  /** gameId -> papel do usuário naquele jogo. */
  roles: Record<string, GameRoleCode>;
}

export const authApi = {
  login(username: string, password: string) {
    return apiRequest<TokenPair>("/auth/login", {
      method: "POST",
      body: { username, password },
      authenticated: false,
    });
  },

  register(username: string, password: string, displayName?: string) {
    return apiRequest<TokenPair>("/auth/register", {
      method: "POST",
      body: { username, password, displayName: displayName || undefined },
      authenticated: false,
    });
  },

  me(signal?: AbortSignal) {
    return apiRequest<Me>("/auth/me", { signal });
  },
};
