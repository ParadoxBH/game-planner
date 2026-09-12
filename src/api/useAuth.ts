import { useCallback, useSyncExternalStore } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authApi } from "./auth";
import { session } from "./session";

/** Conta ativa e contas salvas. Re-renderiza ao entrar, sair ou trocar — inclusive em outra aba. */
export function useSession() {
  return useSyncExternalStore(session.subscribe, session.getState);
}

/** Dados da conta ativa, relidos do backend. Sem conta ativa, não consulta. */
export function useMe() {
  const { activeUsername } = useSession();
  return useQuery({
    queryKey: ["auth", "me", activeUsername],
    queryFn: ({ signal }) => authApi.me(signal),
    enabled: activeUsername !== null,
  });
}

/**
 * Trocar de conta muda o que o backend deixa ver e editar. Todo dado em cache
 * foi buscado com a conta anterior, então é invalidado.
 */
function useInvalidateAll() {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.invalidateQueries(), [queryClient]);
}

export function useLogin() {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: async ({ username, password }: { username: string; password: string }) => {
      const tokens = await authApi.login(username, password);
      return { username, tokens };
    },
    onSuccess: ({ username, tokens }) => {
      session.signIn(username, tokens);
      invalidateAll();
    },
  });
}

export function useRegister() {
  const invalidateAll = useInvalidateAll();
  return useMutation({
    mutationFn: async ({
      username,
      password,
      displayName,
    }: {
      username: string;
      password: string;
      displayName?: string;
    }) => {
      const tokens = await authApi.register(username, password, displayName);
      return { username, tokens };
    },
    onSuccess: ({ username, tokens }) => {
      session.signIn(username, tokens);
      invalidateAll();
    },
  });
}

export function useAccountActions() {
  const invalidateAll = useInvalidateAll();

  const switchTo = useCallback(
    (username: string) => {
      session.switchTo(username);
      invalidateAll();
    },
    [invalidateAll],
  );

  const signOut = useCallback(
    (username: string) => {
      session.signOut(username);
      invalidateAll();
    },
    [invalidateAll],
  );

  return { switchTo, signOut };
}
