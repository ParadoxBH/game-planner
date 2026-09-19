import { API_ORIGIN } from "./config";
import { apiRequest } from "./http";

/** `large` só existe na imagem enviada como mapa (upload com large). */
export type MediaVariantCode = "icon" | "thumb" | "full" | "large";

export interface MediaVariantFile {
  /** Relativa à origem da API. Use mediaFileUrl para montar o endereço completo. */
  url: string;
  width: number;
  height: number;
  bytes: number;
}

export interface MediaInfo {
  /** SHA-256 da variante "full": a mesma imagem sempre tem o mesmo id. */
  id: string;
  /** Dimensões da imagem enviada, antes de redimensionar. */
  width: number;
  height: number;
  animated: boolean;
  variants: Partial<Record<MediaVariantCode, MediaVariantFile>>;
  uploadedBy: string;
  uploadedAt: string;
}

export interface UploadMediaResponse {
  /** false quando a mesma imagem já existia: o servidor não gravou nada de novo. */
  created: boolean;
  media: MediaInfo;
}

export function mediaFileUrl(relativeUrl: string): string {
  return `${API_ORIGIN}${relativeUrl}`;
}

export const mediaApi = {
  /**
   * Envia e converte. Com `large` (imagem de mapa), gera também a variante `large`, de até 8192 px,
   * com limite de 40 MB e sem animação; sem, o limite é 8 MB e o maior tamanho é o `full` (1920 px).
   */
  upload(file: File, large = false) {
    const form = new FormData();
    form.append("file", file);
    return apiRequest<UploadMediaResponse>(`/media${large ? "?large=true" : ""}`, { method: "POST", body: form });
  },

  remove(id: string) {
    return apiRequest<void>(`/media/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};
