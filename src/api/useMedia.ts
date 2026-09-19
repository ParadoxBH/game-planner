import { useMutation } from "@tanstack/react-query";
import { mediaApi } from "./media";

export function useUploadMedia() {
  return useMutation({
    mutationFn: ({ file, large = false }: { file: File; large?: boolean }) => mediaApi.upload(file, large),
  });
}

export function useDeleteMedia() {
  return useMutation({
    mutationFn: (id: string) => mediaApi.remove(id),
  });
}
