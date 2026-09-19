import { useState } from "react";
import { ApiError } from "../../api/ApiError";
import type { ContentResource, MediaUsage } from "../../api/content";
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

/** Texto do campo numérico: vazio é null; o que não é número, undefined (inválido). Aceita vírgula. */
export function numberOf(value: string): number | null | undefined {
  const trimmed = value.trim().replace(",", ".");
  if (trimmed === "") return null;
  const number = Number(trimmed);
  return Number.isFinite(number) ? number : undefined;
}

/** Imagem escolhida no formulário, enviada ao salvar. Sem arquivo, nada é enviado. */
export interface ImageUpload {
  file: File | null;
  usage: MediaUsage;
  /** Gera a variante `large` (imagem de mapa). */
  large?: boolean;
}

export function describeError(error: unknown): string {
  return error instanceof ApiError ? error.message : "Erro inesperado.";
}

/**
 * Salvar de um formulário de conteúdo: cria ou substitui o documento e envia cada imagem escolhida,
 * anexando-a ao código no uso dela (ícone, miniatura, fundo de mapa...). Se uma imagem falha depois de criar, o registro já existe: `created` passa a
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
  const save = async (extId: string, document: object, images: ImageUpload[] = []): Promise<boolean> => {
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
    for (const image of images) {
      if (!image.file) continue;
      try {
        const uploaded = await upload.mutateAsync({ file: image.file, large: image.large });
        await writes.addMedia.mutateAsync({ extId, usage: image.usage, mediaId: uploaded.media.id });
      } catch (cause) {
        setError(`Salvo, mas a imagem não foi enviada: ${describeError(cause)}`);
        setSaving(false);
        return false;
      }
    }
    setSaving(false);
    return true;
  };

  return { save, saving, error, creating };
}
