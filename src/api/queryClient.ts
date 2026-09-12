import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./ApiError";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // 4xx é resposta definitiva do backend (sem permissão, não existe, dados
      // inválidos): repetir não muda nada. Só tenta de novo em falha de rede ou 5xx.
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false;
        return failureCount < 2;
      },
    },
  },
});
