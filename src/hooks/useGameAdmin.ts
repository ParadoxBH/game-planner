import { useMe } from "../api/useAuth";

/**
 * Administra o jogo quem é platform_admin ou owner/moderator dele: os mesmos que o backend deixa
 * apagar conteúdo. É só de interface — cada escrita é validada pelo backend.
 */
export function useGameAdmin(gameId: string | undefined) {
  const me = useMe();
  const role = gameId ? me.data?.roles[gameId] : undefined;
  return {
    isAdmin: Boolean(me.data?.platformAdmin || role === "owner" || role === "moderator"),
    isPending: me.isFetching && !me.data,
  };
}
