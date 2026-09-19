package com.paradoxbh.gameplannerserver.content.service;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;

import org.junit.jupiter.api.Test;

import com.paradoxbh.gameplannerserver.content.store.CategoryHandler;
import com.paradoxbh.gameplannerserver.content.store.ContentHandler;
import com.paradoxbh.gameplannerserver.content.store.EntityHandler;
import com.paradoxbh.gameplannerserver.content.store.EventHandler;
import com.paradoxbh.gameplannerserver.content.store.ItemHandler;
import com.paradoxbh.gameplannerserver.content.store.RecipeHandler;
import com.paradoxbh.gameplannerserver.content.store.RedemptionCodeHandler;

/** A validação da subida, sem banco: os campos de consulta dos handlers não dependem dele. */
class ListingFilterServiceTest {

    private static final List<ContentHandler<?>> HANDLERS = List.of(
            new ItemHandler(null, null),
            new EntityHandler(null, null, null),
            new CategoryHandler(null, null),
            new RecipeHandler(null, null, null),
            new EventHandler(null, null),
            new RedemptionCodeHandler(null, null, null));

    @Test
    void everyDeclaredFilterMatchesTheFieldsOfItsListing() {
        assertThatCode(() -> new ListingFilterService(null, null, null, null, HANDLERS)).doesNotThrowAnyException();
    }

    @Test
    void refusesToStartWhenAFilterHasNoListing() {
        assertThatThrownBy(() -> new ListingFilterService(null, null, null, null, List.of(new ItemHandler(null, null))))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("entities.category");
    }
}
