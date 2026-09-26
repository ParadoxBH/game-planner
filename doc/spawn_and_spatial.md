# Spawns e Inteligência Espacial

Um ponto de spawn responde *o quê* aparece (`occupants`), *onde* (`map`, `location`, `position`),
*quanto e com que chance* (na linha do ocupante) e *sob quais condições* (`conditions`). Este
documento trata da última parte, que é a que os jogos procedurais usam mais.

## Onde: posição ou local

- **Com `position`** (WKT `POINT`, coordenadas de jogo): lugar exato. É o que o mapa desenha.
- **Sem `position`, só com `location`**: a regra vale para o local inteiro — minério que nasce num
  bioma, criatura que surge numa região. Mundo gerado por semente é quase todo assim.

O filtro `location` pega as duas formas: o ponto ligado pelo código do local, e o ponto com posição
dentro da `area` dele (`ST_Within`). Por isso vale a pena um local ter área mesmo quando os pontos
não têm posição: o mapa passa a desenhar a regra como zona.

Dois endpoints entregam o formato compacto de um mapa:

| endpoint | traz | para quê |
| --- | --- | --- |
| `POST .../maps/{map}/spawn-points/query` | só quem tem `position`; condições só com `?conditions=true` | desenhar marcadores |
| `POST .../maps/{map}/spawn-points/rules` | tudo, com ou sem posição, sempre com as condições | avaliar as regras no cliente |

## Condições

Uma condição é uma linha. Cada linha carrega **uma** de quatro formas:

| forma | campos | exemplo |
| --- | --- | --- |
| faixa | `min`, `max` (inclusiva, nulo = sem limite) | `altitude` de 5 a 1000 |
| código | `value` | `time_of_day` = `night` |
| referência | `target` | `weather` → `event:env_rain` |
| bandeira | só o `type` | `hunts_player` |

Grandeza única (um intervalo de 20 s) é faixa com `min` igual a `max` — assim "faixa que cobre o
valor" funciona igual para todo mundo, e a exibição decide entre "20 s" e "20 a 40 s".

`negated` inverte a linha: ela diz onde a regra **não** vale.

### Como as linhas se combinam

- Linhas de **tipos diferentes** valem juntas (E).
- Linhas do **mesmo tipo** são OU. É assim que se expressa conjunto: três linhas `weather`
  significam "clima em {a, b, c}".
- Por tipo T: `satisfeito(T) = (não há positiva OU alguma positiva casa) E (nenhuma negativa casa)`.
- Tipo ausente = sem restrição.

Isso é convenção, não restrição do banco: o SQL do filtro e o avaliador do front implementam a
mesma regra, e quem escreve precisa respeitá-la.

### Não confundir com `events`

`events` é "basta um ativo" e mistura clima, temporada e ataque; é o que o filtro global de eventos
e o painel de clima do mapa usam. `weather` é especificamente o portão de clima da regra. Um
minerador pode escrever nos dois — o do Valheim escreve — e aí são duas fontes para o mesmo fato,
que podem divergir.

## Vocabulário

`type` e `value` são **códigos abertos**, como `respawnMode` e `unlockType`: o servidor não valida a
lista. Ela vive aqui e nas constantes `ConditionTypes` do Core dos mineradores.

### Tipos que filtram

Avaliados contra uma amostra do mundo — uma posição no mapa, um horário, um estado de progressão.

| tipo | forma | significado |
| --- | --- | --- |
| `altitude` | faixa (m) | altura do terreno acima do nível do mar |
| `depth` | faixa (m) | coluna de água acima do ponto |
| `time_of_day` | código `day` / `night` | |
| `biome_area` | código `edge` / `interior` | borda ou miolo da mancha do bioma |
| `forest` | código `inside` / `outside` | |
| `weather` | referência → `event` | uma linha por clima aceito |
| `progress` | `value` = a chave crua; `target` = `entity:<chefe>` quando ela vem de derrotar um | progressão do mundo |
| `distance_from_center` | faixa (m) | distância do centro do mundo |
| `water_surface` | bandeira | fica na superfície da água |
| `near_base` | bandeira | só perto de uma base do jogador |
| `known_item` | referência → `item` | o jogador precisa conhecer o item |

### Tipos descritivos

Aparecem na tela, nunca filtram: não são propriedades de um lugar.

| tipo | forma | significado |
| --- | --- | --- |
| `level` | faixa | nível em que o ocupante aparece (1 é sem estrela) |
| `level_up_chance` | faixa, escalar (%) | chance de subir um nível |
| `max_alive` | faixa, só `max` | quantos ficam vivos ao mesmo tempo por perto |
| `max_total` | faixa, só `max` | quantos o gerador solta no total |
| `spawn_interval` | faixa, escalar (s) | de quanto em quanto tempo tenta |
| `per_zone` | faixa | quantos por zona de geração; abaixo de 1 é a chance de haver um |
| `hunts_player` | bandeira | vai atrás do jogador |
| `duration` | faixa, escalar (s) | quanto dura o evento |
| `dungeon_room` | bandeira | vem de sala sorteada da masmorra |

### O que fica de fora de propósito

Chance e quantidade continuam na linha do ocupante (`chance`, `amount`, `maxAmount`); o bioma
continua em `location`, porque o minerador já divide uma regra de vários biomas em um ponto por
bioma. Condição é o que *restringe*, não o que descreve o resultado.

## Avaliação no cliente

`src/domain/spawn/conditions.ts` recebe um `WorldSample` — o que se sabe de um ponto do mundo — e
devolve `match`, `fail` ou `unknown`. **Campo ausente na amostra é desconhecido, não falha**: sem os
três estados, quem não mexeu no controle de clima ou não veria nada ou veria tudo. `unknown` deixa a
tela dizer "pode aparecer, depende do clima".

É código puro, sem React e sem rede, exatamente para que outra fonte de amostra — um save do jogador
lido no navegador, por exemplo — use o mesmo avaliador sem mudar nada e sem gravar nada no servidor.

O filtro do servidor é mais grosso de propósito: `conditionAltitude equal 50` quer dizer "**tem**
condição de altitude que permite 50", e um ponto sem condição de altitude não casa, ainda que na
prática permita qualquer altitude. Responder "isso nasceria aqui?" é trabalho do avaliador.
