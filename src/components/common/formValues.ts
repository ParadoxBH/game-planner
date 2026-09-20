/** Conversões e validações dos campos de formulário que viram listas de conteúdo. */
import { numberOf } from "./contentForm";

/** Troca a linha de lugar com a vizinha. */
export function move<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const next = [...list];
  [next[index], next[index + direction]] = [next[index + direction], next[index]];
  return next;
}

/** Quantidade: obrigatória e maior que zero. */
export function isPositive(value: string): boolean {
  const number = numberOf(value);
  return number !== null && number !== undefined && number > 0;
}

/** Inteiro opcional: vazio vale, texto que não é inteiro não. */
export function isOptionalInteger(value: string): boolean {
  const number = numberOf(value);
  return number === null || (number !== undefined && Number.isInteger(number));
}

/** Chance em porcentagem: vazia (sempre sai) ou de 0 a 100. */
export function isChance(value: string): boolean {
  const number = numberOf(value);
  return number === null || (number !== undefined && number > 0 && number <= 100);
}

/** Inteiro zero ou mais, opcional: o nível exigido, a posição na lista. Vazio vale. */
export function isLevel(value: string): boolean {
  return value.trim() === "" || /^\d+$/.test(value.trim());
}

/** O mesmo inteiro para o documento: vazio vira null. */
export function levelOut(value: string): number | null {
  return value.trim() === "" ? null : Number(value.trim());
}

/** Chance gravada, de 0 a 1, a partir da porcentagem digitada. */
export function chanceOut(value: string): number | null {
  const number = numberOf(value);
  return number === null || number === undefined ? null : number / 100;
}

/** Porcentagem para a tela, a partir da chance gravada de 0 a 1. */
export function chanceIn(chance: number | null | undefined): string {
  return chance === null || chance === undefined ? "" : String(+(chance * 100).toFixed(4));
}
