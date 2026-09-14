package com.paradoxbh.gameplannerserver.content.web;

import java.math.BigDecimal;
import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.content.model.ContentPage;
import com.paradoxbh.gameplannerserver.content.service.CraftingService;
import com.paradoxbh.gameplannerserver.content.service.CraftingService.Plan;
import com.paradoxbh.gameplannerserver.content.service.CraftingService.Profit;
import com.paradoxbh.gameplannerserver.content.service.CraftingService.Tree;

@RestController
@RequestMapping("/api/v1/games/{gameId}")
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
    @GetMapping("/crafting-tree")
    public Tree tree(@PathVariable String gameId,
                     @RequestParam String target,
                     @RequestParam(defaultValue = "1") BigDecimal amount,
                     @RequestParam(required = false) List<String> choices) {
        return crafting.tree(gameId, target, amount, choices);
    }

    /** Vários alvos numa árvore só. {@code target} e {@code amount} se repetem, na mesma ordem; {@code choices} como na árvore. */
    @GetMapping("/crafting-plan")
    public Plan plan(@PathVariable String gameId,
                     @RequestParam List<String> target,
                     @RequestParam List<BigDecimal> amount,
                     @RequestParam(required = false) List<String> choices) {
        return crafting.plan(gameId, target, amount, choices);
    }

    /** Rentabilidade de um lote de cada produto do jogo. {@code timed=true} traz só o que tem tempo de receita. */
    @GetMapping("/crafting-profits")
    public ContentPage<Profit> profits(@PathVariable String gameId,
                                       @RequestParam(required = false) String search,
                                       @RequestParam(defaultValue = "false") boolean timed,
                                       @RequestParam(defaultValue = "-profit") String sort,
                                       @RequestParam(defaultValue = "0") int page,
                                       @RequestParam(defaultValue = "50") int size) {
        return crafting.profits(gameId, search, timed, sort, page, size);
    }
}
