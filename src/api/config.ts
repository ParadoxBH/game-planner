/**
 * Endereço do backend. Sem VITE_API_URL, aponta para o Spring rodando local.
 * Ver .env.example na raiz do projeto.
 */
const apiOrigin: string = (import.meta.env.VITE_API_URL ?? "http://localhost:8080").replace(/\/+$/, "");

export const API_BASE_URL = `${apiOrigin}/api/v1`;
