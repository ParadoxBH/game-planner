import { API_ORIGIN } from "./config";
import { apiRequest } from "./http";

export type MediaVariantCode = "icon" | "thumb" | "full";

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
  upload(file: File) {
    const form = new FormData();
    form.append("file", file);
    return apiRequest<UploadMediaResponse>("/media", { method: "POST", body: form });
  },

  remove(id: string) {
    return apiRequest<void>(`/media/${encodeURIComponent(id)}`, { method: "DELETE" });
  },
};
