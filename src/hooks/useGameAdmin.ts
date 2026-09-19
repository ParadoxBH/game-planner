import { useMe } from "../api/useAuth";
import { useGame } from "../api/useContent";

/**
 * Administra o jogo quem é platform_admin ou owner/moderator dele: os mesmos que o backend deixa
 * apagar conteúdo. `isOwner` é quem pode mudar o próprio jogo (dados, políticas, imagens):
 * platform_admin ou owner. É só de interface — cada escrita é validada pelo backend.
 */
export function useGameAdmin(gameId: string | undefined) {
  const me = useMe();
  const role = gameId ? me.data?.roles[gameId] : undefined;
  return {
    isAdmin: Boolean(me.data?.platformAdmin || role === "owner" || role === "moderator"),
    isOwner: Boolean(me.data?.platformAdmin || role === "owner"),
    isPending: me.isFetching && !me.data,
  };
}

/**
 * Cria e edita conteúdo quem o backend deixa: conta ativa e verificada que é platform_admin, membro do
 * jogo ou, em jogo de escrita comunitária, qualquer uma. Também só de interface.
 */
export function useGameEditor(gameId: string | undefined) {
  const me = useMe();
  const game = useGame(gameId);
  const user = me.data;
  const canWrite =
    Boolean(user && gameId) &&
    user!.status === "active" &&
    user!.verified &&
    (user!.platformAdmin || Boolean(user!.roles[gameId!]) || game.data?.writePolicy === "community");
  return { canEdit: canWrite };
}
