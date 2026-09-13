/**
 * Modo de desenvolvimento do front, ligado por localStorage ("showDev"): libera jogos
 * marcados como "em breve" e força recarregar os dados a cada visita.
 *
 * O painel de ferramentas que ficava aqui virou a página de Utilitários
 * (src/components/tools), acessível pelo menu da conta e restrita a platform_admin.
 */

export function isDev() {
  return localStorage.getItem("showDev") === "true";
}

export function setIsDev(value: boolean) {
  localStorage.setItem("showDev", value ? "true" : "false");
}
