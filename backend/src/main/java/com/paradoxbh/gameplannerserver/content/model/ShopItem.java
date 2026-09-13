package com.paradoxbh.gameplannerserver.content.model;

import java.math.BigDecimal;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ExtIds;

/**
 * Item de uma categoria de loja. {@code quantity} é o tamanho do pacote (nulo = avulso);
 * {@code purchaseLimit}, quantas compras até o {@code resetType}; o preço é em {@code currency},
 * que também é conteúdo. O mesmo alvo pode se repetir, ex.: pacotes de tamanhos diferentes.
 */
public record ShopItem(
        Reference target,
        BigDecimal quantity,
        Integer purchaseLimit,
        BigDecimal price,
        Reference currency,
        String resetType,
        String rarityCode) {

    ShopItem canonical(String field) {
        if (purchaseLimit != null && purchaseLimit <= 0) {
            throw ApiException.badRequest(field + ".purchaseLimit precisa ser maior que zero");
        }
        return new ShopItem(
                Canon.target(target, field + ".target"),
                Canon.optionalPositive(quantity, field + ".quantity"),
                purchaseLimit,
                Canon.notNegative(price, field + ".price"),
                Canon.reference(currency, field + ".currency"),
                Canon.code(resetType, field + ".resetType", null),
                ExtIds.optional(rarityCode, field + ".rarityCode"));
    }
}
