import type { FilterValues } from "../api/query";

/**
 * Filtros que as listagens de itens e entidades recebem pela URL, /list/:category?subCategory=x: a categoria
 * principal ("all" é nenhuma) e uma sub-categoria marcada como "conter".
 */
export function categoryUrlFilters(category: string | undefined, subCategory: string | null): FilterValues {
  return {
    category: category && category !== "all" ? category : null,
    subCategory: subCategory ? { [subCategory]: "include" } : {},
  };
}
