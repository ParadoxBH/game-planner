import { useMutation } from "@tanstack/react-query";
import { mediaApi } from "./media";

export function useUploadMedia() {
  return useMutation({
    mutationFn: (file: File) => mediaApi.upload(file),
  });
}

export function useDeleteMedia() {
  return useMutation({
    mutationFn: (id: string) => mediaApi.remove(id),
  });
}
