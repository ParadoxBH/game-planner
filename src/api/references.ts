import { API_ORIGIN } from "./config";
import type { MediaLink, MediaUsage, Reference, ResolvedReference } from "./content";

export type MediaVariant = "icon" | "thumb" | "full";

/** Endereço do arquivo convertido de uma mídia: icon (128 px), thumb (512 px) ou full (1920 px). */
export function mediaUrl(mediaId: string, variant: MediaVariant = "icon"): string {
  return `${API_ORIGIN}/media/${encodeURIComponent(mediaId)}/${variant}.webp`;
}

/** A imagem atual de um uso: entre várias, a adicionada por último — a mesma regra do backend. */
export function currentMedia(media: MediaLink[] | undefined, usage: MediaUsage): string | null {
  const links = (media ?? []).filter((link) => link.usage === usage);
  if (links.length === 0) return null;
  return links.reduce((latest, link) => ((link.addedAt ?? "") > (latest.addedAt ?? "") ? link : latest)).mediaId;
}

/** Mesmo alvo: mesmo código, e tipos iguais ou algum deles sem tipo. */
export function sameTarget(a: Reference, b: Reference): boolean {
  return a.extId === b.extId && (!a.kind || !b.kind || a.kind === b.kind);
}

/** Referência resolvida a partir de um documento que já está em mãos. */
export function resolvedFrom(kind: string, document: { extId: string; name: string | null; media: MediaLink[] }): ResolvedReference {
  return {
    kind,
    extId: document.extId,
    resolvedKind: kind,
    name: document.name,
    iconMediaId: currentMedia(document.media, "icon"),
  };
}

function key(kind: string | null | undefined, extId: string): string {
  return `${kind ?? ""}:${extId}`;
}

/** Busca das referências resolvidas de um detalhe, por tipo e código. */
export class ReferenceIndex {
  private readonly byKey = new Map<string, ResolvedReference>();

  constructor(references: ResolvedReference[] = []) {
    references.forEach((reference) => {
      this.byKey.set(key(reference.kind, reference.extId), reference);
      if (reference.resolvedKind && !this.byKey.has(key(reference.resolvedKind, reference.extId))) {
        this.byKey.set(key(reference.resolvedKind, reference.extId), reference);
      }
      if (!this.byKey.has(key(null, reference.extId))) {
        this.byKey.set(key(null, reference.extId), reference);
      }
    });
  }

  find(target: Reference): ResolvedReference | undefined {
    return this.byKey.get(key(target.kind, target.extId)) ?? this.byKey.get(key(null, target.extId));
  }

  name(target: Reference): string {
    return this.find(target)?.name ?? target.extId;
  }
}

/** Rota da tela de um conteúdo; nula para tipos que ainda não têm tela própria. */
export function contentRoute(gameId: string, kind: string | null | undefined, extId: string): string | null {
  const id = encodeURIComponent(extId);
  switch (kind) {
    case "item":
      return `/game/${gameId}/items/view/${id}`;
    case "entity":
      return `/game/${gameId}/entity/view/${id}`;
    case "recipe":
      return `/game/${gameId}/recipes/view/${id}`;
    case "category":
      return `/game/${gameId}/categories/view/${id}`;
    case "event":
      return `/game/${gameId}/events/view/${id}`;
    case "shop":
      return `/game/${gameId}/shops/list/${id}`;
    case "collection":
      return `/game/${gameId}/conjuntos/${id}`;
    case "map":
      return `/game/${gameId}/map/${id}`;
    case "redemption_code":
      return `/game/${gameId}/codes`;
    default:
      return null;
  }
}
