package com.paradoxbh.gameplannerserver.query;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonValue;

/**
 * Filtro de tela de uma listagem: um seletor que o front desenha como {@code display} manda e
 * traduz em QueryJson. Opção sem {@code query} vale {@code field equal valor}; em {@code multi},
 * "não conter" vale {@code exclude} ou, sem ele, {@code field not_equal valor}. Assim um valor que
 * chega pela URL e não está entre as opções ainda filtra.
 *
 * {@code key} é o nome do valor escolhido no front; {@code defaultValue}, o valor antes de o
 * usuário mexer; {@code icon}, um nome curto de ícone ("trade", "station") que o front conhece.
 * {@code dependsOn} é a key de outro filtro: com um valor escolhido nele, só valem as opções que o
 * têm em {@code parents}, como as sub-categorias de uma categoria principal.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ListingFilter(String key, String label, Display display, String icon, String allLabel, String field,
                            String defaultValue, String dependsOn, List<Option> options) {

    /** select escolhe uma opção; multi marca cada uma como conter ou não conter; tabs é select em abas; switch liga a única opção. */
    public enum Display {
        SELECT, MULTI, TABS, SWITCH;

        @JsonValue
        public String code() {
            return name().toLowerCase();
        }
    }

    /**
     * {@code count}, quando vem, é quantos registros a opção tem, para exibir junto do rótulo;
     * {@code parents}, sob quais valores do filtro de {@code dependsOn} ela aparece.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Option(String value, String label, String iconMediaId, Long count, QueryJson query,
                         QueryJson exclude, List<String> parents) {

        public static Option of(String value, String label) {
            return new Option(value, label, null, null, null, null, null);
        }

        public static Option of(String value, String label, QueryJson query) {
            return new Option(value, label, null, null, query, null, null);
        }
    }

    public ListingFilter {
        options = List.copyOf(options);
    }

    public ListingFilter withOptions(List<Option> options) {
        return new ListingFilter(key, label, display, icon, allLabel, field, defaultValue, dependsOn, options);
    }
}
