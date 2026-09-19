import type { ContentResource, Reference } from "../../api/content";
import { currentMedia } from "../../api/references";
import { useContentDocument } from "../../api/useContent";
import { ContentIcon } from "./ContentIcon";

/** Listagem de cada tipo de referência; sem tipo, procura como item. */
const RESOURCES: Record<string, ContentResource> = {
  item: "items",
  entity: "entities",
  category: "categories",
};

/**
 * Ícone e nome de um conteúdo citado, lidos pelo código. Enquanto não chega, ou se não está
 * cadastrado, mostra o código.
 */
export function ReferenceName({ gameId, target, iconSize = 20 }: { gameId: string; target: Reference; iconSize?: number }) {
  const resource = RESOURCES[target.kind ?? "item"] ?? "items";
  const document = useContentDocument<{ name: string | null; media: { usage: "icon"; mediaId: string }[] }>(
    gameId,
    resource,
    target.extId,
  );
  const name = document.data?.name;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
      <ContentIcon mediaId={document.data ? currentMedia(document.data.media, "icon") : null} kind={target.kind ?? "item"} size={iconSize} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {name ? `${name}` : target.extId}
        {target.kind === "category" && " (categoria)"}
      </span>
    </span>
  );
}
