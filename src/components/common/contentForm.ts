import { useState } from "react";
import { ApiError } from "../../api/ApiError";
import type { ContentResource, MediaLink, MediaUsage } from "../../api/content";
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
  /** Imagens a desligar do código antes do envio, ex.: ao remover a imagem do uso. */
  remove?: MediaLink[];
}

export function describeError(error: unknown): string {
  return error instanceof ApiError ? error.message : "Erro inesperado.";
}

/**
 * Salvar de um formulário de conteúdo: envia as imagens escolhidas, cria ou substitui o documento e
 * liga cada imagem ao código no uso dela (ícone, miniatura, fundo de mapa...). O envio vem antes da
 * gravação: se falha, nada foi criado e tentar de novo é limpo. Se a ligação falha depois de criar,
 * o registro já existe: `created` passa a valer, e tentar de novo substitui em vez de criar outra vez.
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
    const fail = (message: string) => {
      setError(message);
      setSaving(false);
      return false;
    };

    const uploaded: { usage: MediaUsage; mediaId: string }[] = [];
    try {
      for (const image of images) {
        if (!image.file) continue;
        const result = await upload.mutateAsync({ file: image.file, large: image.large });
        uploaded.push({ usage: image.usage, mediaId: result.media.id });
      }
    } catch (cause) {
      return fail(`A imagem não foi enviada: ${describeError(cause)}`);
    }

    try {
      if (creating) {
        await writes.create.mutateAsync(document);
        setCreated(true);
      } else {
        await writes.put.mutateAsync({ extId, document });
      }
    } catch (cause) {
      return fail(describeError(cause));
    }

    try {
      for (const link of images.flatMap((image) => image.remove ?? [])) {
        await writes.removeMedia.mutateAsync({ extId, usage: link.usage, mediaId: link.mediaId });
      }
    } catch (cause) {
      return fail(`Salvo, mas a imagem não foi removida: ${describeError(cause)}`);
    }
    try {
      for (const link of uploaded) {
        await writes.addMedia.mutateAsync({ extId, usage: link.usage, mediaId: link.mediaId });
      }
    } catch (cause) {
      return fail(`Salvo, mas a imagem não foi ligada ao registro: ${describeError(cause)}`);
    }
    setSaving(false);
    return true;
  };

  return { save, saving, error, creating };
}
