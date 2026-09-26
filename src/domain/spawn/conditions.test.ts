import { describe, expect, it } from "vitest";
import type { SpawnCondition } from "../../api/content";
import { combine, explainConditions, matchesConditions, type Outcome, type WorldSample } from "./conditions";

/** Atalhos para montar as quatro formas de linha sem repetir os nulos. */
const row = (type: string, extra: Partial<SpawnCondition> = {}): SpawnCondition => ({
  type,
  value: null,
  target: null,
  min: null,
  max: null,
  negated: null,
  ...extra,
});

const range = (type: string, min: number | null, max: number | null) => row(type, { min, max });
const code = (type: string, value: string) => row(type, { value });
const ref = (type: string, kind: string, extId: string) => row(type, { target: { kind, extId } });

describe("matchesConditions", () => {
  const cases: [string, WorldSample, SpawnCondition[], Outcome][] = [
    ["sem condição, vale sempre", {}, [], "match"],

    // Faixa: inclusiva nas duas pontas; null é sem limite.
    ["altitude dentro", { altitude: 50 }, [range("altitude", 5, 100)], "match"],
    ["altitude no mínimo", { altitude: 5 }, [range("altitude", 5, 100)], "match"],
    ["altitude no máximo", { altitude: 100 }, [range("altitude", 5, 100)], "match"],
    ["altitude abaixo", { altitude: 4 }, [range("altitude", 5, 100)], "fail"],
    ["altitude acima", { altitude: 101 }, [range("altitude", 5, 100)], "fail"],
    ["só mínimo", { altitude: 9999 }, [range("altitude", 5, null)], "match"],
    ["só máximo", { altitude: -50 }, [range("altitude", null, 100)], "match"],

    // Desconhecido: campo ausente na amostra não reprova.
    ["altitude não informada", {}, [range("altitude", 5, 100)], "unknown"],
    ["altitude null é desconhecida", { altitude: null }, [range("altitude", 5, 100)], "unknown"],

    // Código.
    ["noite bate", { timeOfDay: "night" }, [code("time_of_day", "night")], "match"],
    ["dia não bate com noite", { timeOfDay: "day" }, [code("time_of_day", "night")], "fail"],
    ["floresta dentro", { forest: true }, [code("forest", "inside")], "match"],
    ["floresta fora", { forest: false }, [code("forest", "inside")], "fail"],
    ["fora da floresta bate", { forest: false }, [code("forest", "outside")], "match"],

    // E entre tipos diferentes.
    ["dois tipos, ambos batem", { altitude: 50, timeOfDay: "night" },
      [range("altitude", 5, 100), code("time_of_day", "night")], "match"],
    ["dois tipos, um reprova", { altitude: 50, timeOfDay: "day" },
      [range("altitude", 5, 100), code("time_of_day", "night")], "fail"],
    ["reprovação vence desconhecido", { timeOfDay: "day" },
      [range("altitude", 5, 100), code("time_of_day", "night")], "fail"],
    ["desconhecido vence acerto", { altitude: 50 },
      [range("altitude", 5, 100), code("time_of_day", "night")], "unknown"],

    // OU dentro do mesmo tipo: é assim que se expressa conjunto.
    ["clima em conjunto, um bate", { weather: "env_rain" },
      [ref("weather", "event", "env_rain"), ref("weather", "event", "env_snow")], "match"],
    ["clima em conjunto, nenhum bate", { weather: "env_clear" },
      [ref("weather", "event", "env_rain"), ref("weather", "event", "env_snow")], "fail"],

    // Negação.
    ["negada que não ocorre, passa", { progress: ["defeated_eikthyr"] },
      [row("progress", { value: "defeated_bonemass", negated: true })], "match"],
    ["negada que ocorre, reprova", { progress: ["defeated_bonemass"] },
      [row("progress", { value: "defeated_bonemass", negated: true })], "fail"],
    ["positiva e negada do mesmo tipo", { progress: ["defeated_eikthyr"] },
      [row("progress", { value: "defeated_eikthyr" }), row("progress", { value: "defeated_bonemass", negated: true })],
      "match"],
    ["negada desconhecida", {},
      [row("progress", { value: "defeated_bonemass", negated: true })], "unknown"],

    // Progressão aceita a chave crua ou o ext id do chefe: a origem pode dar qualquer um.
    ["progressão pela chave", { progress: ["defeated_eikthyr"] },
      [row("progress", { value: "defeated_eikthyr", target: { kind: "entity", extId: "Eikthyr" } })], "match"],
    ["progressão pelo chefe", { progress: ["Eikthyr"] },
      [row("progress", { value: "defeated_eikthyr", target: { kind: "entity", extId: "Eikthyr" } })], "match"],
    ["progressão vazia reprova", { progress: [] },
      [row("progress", { value: "defeated_eikthyr" })], "fail"],

    // Bandeira.
    ["perto de base", { nearBase: true }, [row("near_base")], "match"],
    ["longe de base", { nearBase: false }, [row("near_base")], "fail"],

    // Descritivo nunca reprova, mesmo com a amostra dizendo outra coisa.
    ["nível não filtra", { altitude: 50 }, [range("level", 3, 3), range("altitude", 5, 100)], "match"],
    ["intervalo não filtra", {}, [range("spawn_interval", 20, 20)], "match"],
    ["caça o jogador não filtra", {}, [row("hunts_player")], "match"],
    ["tipo desconhecido não filtra", {}, [row("inventado_por_outro_jogo")], "match"],
  ];

  it.each(cases)("%s", (_name, sample, conditions, expected) => {
    expect(matchesConditions(sample, conditions)).toBe(expected);
  });
});

describe("explainConditions", () => {
  it("devolve um resultado por tipo, só dos que filtram", () => {
    const conditions = [
      range("altitude", 5, 100),
      code("time_of_day", "night"),
      range("level", 1, 3),
      row("hunts_player"),
    ];
    const explained = explainConditions({ altitude: 50, timeOfDay: "day" }, conditions);
    expect(explained.map((entry) => entry.type)).toEqual(["altitude", "time_of_day"]);
    expect(explained.find((entry) => entry.type === "altitude")?.outcome).toBe("match");
    expect(explained.find((entry) => entry.type === "time_of_day")?.outcome).toBe("fail");
  });

  it("junta as linhas do mesmo tipo num resultado só", () => {
    const conditions = [ref("weather", "event", "env_rain"), ref("weather", "event", "env_snow")];
    const explained = explainConditions({ weather: "env_snow" }, conditions);
    expect(explained).toHaveLength(1);
    expect(explained[0].conditions).toHaveLength(2);
    expect(explained[0].outcome).toBe("match");
  });

  it("aponta o único tipo que reprovou, que é o 'por que não' da tela", () => {
    const conditions = [range("altitude", 5, 100), code("time_of_day", "night"), code("forest", "inside")];
    const sample: WorldSample = { altitude: 50, timeOfDay: "day", forest: true };
    const failed = explainConditions(sample, conditions).filter((entry) => entry.outcome === "fail");
    expect(failed.map((entry) => entry.type)).toEqual(["time_of_day"]);
  });
});

describe("combine", () => {
  it.each([
    [[], "match"],
    [["match", "match"], "match"],
    [["match", "unknown"], "unknown"],
    [["match", "fail"], "fail"],
    [["unknown", "fail"], "fail"],
  ] as [Outcome[], Outcome][])("%j -> %s", (outcomes, expected) => {
    expect(combine(outcomes)).toBe(expected);
  });
});
