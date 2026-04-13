/**
 * Resolve um caminho de arquivo público (da pasta /public) garantindo que 
 * funcione corretamente tanto em desenvolvimento quanto em produção (GitHub Pages).
 * 
 * @param path O caminho do arquivo (ex: "/img/logo.png" ou "img/logo.png")
 * @returns O caminho final ajustado com o BASE_URL da aplicação
 */
export function getPublicUrl(path: string | undefined | null): string {
  if (!path) return '';

  const baseUrl = import.meta.env.BASE_URL || '/';
  
  // Se o caminho já for absoluto ou um blob, retorna sem alterações
  if (
    path.startsWith('http://') || 
    path.startsWith('https://') || 
    path.startsWith('data:') || 
    path.startsWith('blob:')
  ) {
    return path;
  }

  // Normalização do caminho interno:
  let cleanPath = path.trim();

  // 1. Remove menções a "public" de forma mais agressiva e case-insensitive
  // Isso remove: "/public/", "public/", "./public/"
  const publicRegex = /^(\.\/|\/)?public\//i;
  cleanPath = cleanPath.replace(publicRegex, '');

  // 2. Remove o "/" inicial para evitar duplicidade com o baseUrl
  if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.slice(1);
  }

  // 3. Garante que o baseUrl termina com barra para concatenação limpa
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  return `${normalizedBase}${cleanPath}`;
}
