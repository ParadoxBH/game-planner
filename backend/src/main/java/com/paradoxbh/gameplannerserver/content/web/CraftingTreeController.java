package com.paradoxbh.gameplannerserver.content.web;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.content.service.CraftingService;
import com.paradoxbh.gameplannerserver.content.service.CraftingService.Tree;

@RestController
@RequestMapping("/api/v1/games/{gameId}/crafting-tree")
public class CraftingTreeController {

    private final CraftingService crafting;

    public CraftingTreeController(CraftingService crafting) {
        this.crafting = crafting;
    }

    /**
     * {@code target} é "tipo:id". {@code choices} se repete: "category:vegetal=item:tomate" escolhe o
     * membro de uma categoria; "item:prego=buy" compra em vez de craftar, "=base" para ali, e
     * "=codigo_da_receita" escolhe a receita.
     */
    @GetMapping
    public Tree tree(@PathVariable String gameId,
                     @RequestParam String target,
                     @RequestParam(defaultValue = "1") BigDecimal amount,
                     @RequestParam(required = false) List<String> choices) {
        return crafting.tree(gameId, target, amount, choices);
    }
}
