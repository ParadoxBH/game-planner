import { useState } from "react";
import { ApiError } from "../../api/ApiError";
import type { ContentResource } from "../../api/content";
import { useContentWrites } from "../../api/useContent";
import { useUploadMedia } from "../../api/useMedia";

/** Código sugerido a partir do nome: minúsculo, sem acento, com "_" no lugar de espaço e pontuação. */
export function slugOf(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function describeError(error: unknown): string {
  return error instanceof ApiError ? error.message : "Erro inesperado.";
}

/**
 * Salvar de um formulário de conteúdo: cria ou substitui o documento e, com um ícone escolhido, envia a
 * imagem e a anexa ao código. Se o ícone falha depois de criar, o registro já existe: `created` passa a
 * valer, e tentar de novo substitui em vez de criar outra vez.
 */
export function useContentSave(gameId: string, resource: ContentResource, isNew: boolean) {
  const writes = useContentWrites(gameId, resource);
  const upload = useUploadMedia();
  const [created, setCreated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const creating = isNew && !created;

  /** true quando salvou tudo. */
  const save = async (extId: string, document: object, icon: File | null): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      if (creating) {
        await writes.create.mutateAsync(document);
        setCreated(true);
      } else {
        await writes.put.mutateAsync({ extId, document });
      }
    } catch (cause) {
      setError(describeError(cause));
      setSaving(false);
      return false;
    }
    if (icon) {
      try {
        const uploaded = await upload.mutateAsync(icon);
        await writes.addMedia.mutateAsync({ extId, usage: "icon", mediaId: uploaded.media.id });
      } catch (cause) {
        setError(`Salvo, mas o ícone não foi enviado: ${describeError(cause)}`);
        setSaving(false);
        return false;
      }
    }
    setSaving(false);
    return true;
  };

  return { save, saving, error, creating };
}
