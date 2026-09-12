/**
 * Deploy para o GitHub Pages DESATIVADO em 12/09/2026.
 *
 * O front passou a depender do backend (Java/Spring, pasta backend/), que por
 * enquanto só roda localmente. Publicar agora colocaria no ar um site quebrado,
 * tentando chamar a API em http://localhost:8080 na máquina de cada visitante.
 *
 * A página atual do GitHub Pages fica congelada de propósito até a migração para
 * o backend terminar. Depois disso, o GitHub Pages será desativado.
 *
 * Para reativar, em package.json, trocar a linha do "deploy" por:
 *   "predeploy": "npm run build",
 *   "deploy": "node scripts/deploy.js"
 * O script original (scripts/deploy.js) não foi alterado.
 */

const line = "=".repeat(64);

console.error(`
${line}
  DEPLOY DESATIVADO
${line}

  O front agora depende do backend (Java/Spring), que ainda roda
  só localmente. Publicar no GitHub Pages agora colocaria no ar
  um site quebrado, tentando chamar http://localhost:8080 na
  máquina de cada visitante.

  A página atual do GitHub Pages está congelada de propósito até
  a migração para o backend terminar. Depois, o GitHub Pages será
  desativado.

  Detalhes e como reativar: scripts/deploy-disabled.js

${line}
`);

process.exit(1);
