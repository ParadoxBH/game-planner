import type { CollectionGroupDocument, Reference } from "../../api/content";

/**
 * O grupo como documento de escrita: sem media nem meta, que não são do formulário (o PUT em lote mantém o que o
 * grupo já tem). `changes` troca campos, ex.: a posição ou os membros.
 */
export function groupPayload(group: CollectionGroupDocument, changes: Partial<Pick<CollectionGroupDocument, "ordinal" | "members">> = {}) {
  return {
    extId: group.extId,
    name: group.name,
    summary: group.summary,
    description: group.description,
    collections: group.collections,
    members: group.members,
    events: group.events,
    ordinal: group.ordinal,
    ...changes,
  };
}

/** O membro é este conteúdo: mesmo código e mesmo tipo (membro gravado sem tipo casa com qualquer tipo). */
export function isMember(member: Reference, target: Reference): boolean {
  return member.extId === target.extId && (member.kind == null || member.kind === target.kind);
}
