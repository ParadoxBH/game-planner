package com.paradoxbh.gameplannerserver.content.service;

import java.math.BigDecimal;
import java.math.MathContext;
import java.math.RoundingMode;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ExtIds;
import com.paradoxbh.gameplannerserver.content.model.Reference;
import com.paradoxbh.gameplannerserver.content.service.DetailsService.ResolvedReference;
import com.paradoxbh.gameplannerserver.identity.service.GameAccess;

/**
 * Árvore de crafting calculada no servidor: do alvo até os recursos base, com lotes, compras, o
 * que é preciso juntar e o que sobra.
 *
 * Regras (doc/backend_plan.md, Fase 6):
 * <ul>
 * <li>Com receita, crafta; a loja aparece como alternativa ({@code buyable}). A escolha "buy" por
 * alvo compra, "base" para ali, e o código de uma receita escolhe entre as que produzem o alvo.</li>
 * <li>Sem receita, compra na oferta de menor preço por unidade; sem oferta, usa o preço base do
 * conteúdo; sem nada disso, é recurso base.</li>
 * <li>Lotes e pacotes são sempre inteiros. O que sobra — o excedente do último lote, o resto do
 * pacote e os subprodutos certos da receita — vai para o estoque, e o próximo nó que precisa do
 * mesmo alvo usa o estoque antes de craftar ou comprar de novo.</li>
 * <li>Ingrediente não consumido é obtido uma vez: depois disso fica no estoque e não é gasto.</li>
 * <li>Moeda que é conteúdo vira nó filho com o valor gasto, e desce como qualquer outro alvo.</li>
 * <li>Ingrediente que é categoria fica em aberto, com as opções, até ser escolhido; com um membro
 * só, usa esse membro.</li>
 * <li>Alvo que já está no caminho não desce de novo ({@code cycle}).</li>
 * </ul>
 */
@Service
public class CraftingService {

    public static final int MAX_NODES = 5_000;
    public static final int MAX_DEPTH = 64;

    /**
     * {@code amount} é o que o pai pede; {@code fromStock}, quanto disso veio do que sobrou antes;
     * {@code leftover}, o que este nó produziu ou comprou além do pedido e foi para o estoque.
     */
    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Node(Reference target, String name, String iconMediaId, BigDecimal amount, BigDecimal fromStock,
                       BigDecimal leftover, Boolean notConsumed, String source, String category,
                       List<ResolvedReference> options, RecipeUse recipe, List<String> alternatives, Boolean buyable,
                       Purchase purchase, Price price, List<Node> children) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record RecipeUse(String extId, String name, BigDecimal batches, BigDecimal produced,
                            BigDecimal craftTimeSeconds, List<ResolvedReference> stations) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Purchase(String shopCategory, String shop, BigDecimal packs, BigDecimal packSize, BigDecimal price,
                           Reference currency, BigDecimal cost, Integer purchaseLimit, String resetType) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record Price(BigDecimal unitPrice, Reference currency, BigDecimal cost) {
    }

    public record Amount(Reference target, String name, String iconMediaId, BigDecimal amount) {
    }

    @JsonInclude(JsonInclude.Include.NON_NULL)
    public record PurchaseTotal(Reference target, String name, String shopCategory, String shop, BigDecimal packs,
                                BigDecimal cost, Reference currency) {
    }

    public record RecipeTotal(String extId, String name, BigDecimal batches) {
    }

    /**
     * {@code baseResources} somam o que é consumido; {@code tools}, o que é exigido e não gasto;
     * {@code leftovers}, o que sobrou no fim. {@code costWithoutCurrency} soma preços sem moeda informada.
     */
    public record Totals(List<Amount> baseResources, List<Amount> tools, List<Amount> leftovers,
                         List<PurchaseTotal> purchases, List<RecipeTotal> recipes, List<ResolvedReference> stations,
                         BigDecimal craftTimeSeconds, List<Amount> openCategories, List<Reference> cycles,
                         BigDecimal costWithoutCurrency) {
    }

    public record Tree(Node root, Totals totals) {
    }

    private record Input(Reference target, BigDecimal amount, boolean notConsumed) {
    }

    private record Output(String recipe, Reference target, BigDecimal amount, BigDecimal chance) {
    }

    private record RecipeRow(Integer craftTimeSeconds, List<Input> inputs, List<String> stations,
                             List<Output> outputs) {
    }

    private record Offer(String shopCategory, String shop, Reference target, BigDecimal quantity,
                         Integer purchaseLimit, BigDecimal price, Reference currency, String resetType) {

        BigDecimal unitPrice() {
            return quantity == null ? price : price.divide(quantity, MathContext.DECIMAL64);
        }
    }

    private record BasePrice(Reference target, BigDecimal price, Reference currency) {
    }

    private record NameRow(String kind, String name, String iconMediaId) {
    }

    /** Tudo o que a árvore consulta, carregado do jogo inteiro de uma vez. */
    private static final class Graph {
        final Map<String, List<Input>> inputs = new HashMap<>();
        final Map<String, List<String>> stations = new HashMap<>();
        final Map<String, List<Output>> outputs = new HashMap<>();
        final Map<String, RecipeRow> recipes = new HashMap<>();
        final Map<String, List<Output>> producers = new HashMap<>();
        final Map<String, List<Offer>> offers = new HashMap<>();
        final Map<String, List<BasePrice>> prices = new HashMap<>();
        final Map<String, List<Reference>> categoryMembers = new HashMap<>();
    }

    /** Escolhas do usuário: membro de categoria e, por alvo, "buy", "base" ou o código da receita. */
    private record Choices(Map<String, Reference> categories, Map<String, String> products) {

        static Choices parse(List<String> values) {
            Map<String, Reference> categories = new HashMap<>();
            Map<String, String> products = new HashMap<>();
            for (String value : values == null ? List.<String>of() : values) {
                int separator = value.indexOf('=');
                if (separator <= 0 || separator == value.length() - 1) {
                    throw ApiException.badRequest("choices precisa ser alvo=escolha, ex.: category:vegetal=item:tomate"
                            + " ou item:prego=buy");
                }
                Reference target = Reference.parse(value.substring(0, separator), "choices");
                String choice = value.substring(separator + 1);
                if ("category".equals(target.kind())) {
                    categories.put(target.extId(), Reference.parse(choice, "choices"));
                } else {
                    products.put(key(target),
                            choice.equals("buy") || choice.equals("base") ? choice : ExtIds.require(choice, "choices"));
                }
            }
            return new Choices(categories, products);
        }

        String product(Reference target) {
            String exact = products.get(key(target));
            return exact != null ? exact : products.get(key(new Reference(null, target.extId())));
        }
    }

    /** Nó em construção; vira {@link Node} depois que os nomes são carregados. */
    private static final class Draft {
        final Reference target;
        final BigDecimal amount;
        final boolean notConsumed;
        BigDecimal fromStock = BigDecimal.ZERO;
        BigDecimal remainder;
        BigDecimal leftover = BigDecimal.ZERO;
        String source;
        String category;
        List<Reference> options;
        String recipe;
        BigDecimal batches;
        BigDecimal produced;
        BigDecimal craftTime;
        List<String> stations;
        List<String> alternatives = List.of();
        boolean buyable;
        Offer offer;
        BigDecimal packs;
        BigDecimal cost;
        BasePrice basePrice;
        final List<Draft> children = new ArrayList<>();

        Draft(Reference target, BigDecimal amount, boolean notConsumed) {
            this.target = target;
            this.amount = amount;
            this.notConsumed = notConsumed;
            this.remainder = amount;
        }
    }

    private final GameAccess access;
    private final JdbcClient jdbc;

    public CraftingService(GameAccess access, JdbcClient jdbc) {
        this.access = access;
        this.jdbc = jdbc;
    }

    public Tree tree(String gameId, String target, BigDecimal amount, List<String> choices) {
        access.requireReadable(gameId);
        Reference root = Reference.parse(target, "target");
        if (amount == null || amount.signum() <= 0) {
            throw ApiException.badRequest("amount precisa ser maior que zero");
        }
        Builder builder = new Builder(load(gameId), Choices.parse(choices));
        Draft draft = builder.node(root, amount.stripTrailingZeros(), false, new ArrayDeque<>(), 0);

        Map<String, List<NameRow>> names = names(gameId, builder.ids);
        return new Tree(convert(draft, names), totals(draft, builder, names));
    }

    private static final class Builder {
        final Graph graph;
        final Choices choices;
        final Set<String> ids = new HashSet<>();
        /** O que sobrou até aqui, por alvo, na ordem em que apareceu. */
        final Map<String, BigDecimal> stock = new LinkedHashMap<>();
        final Map<String, Reference> stockTargets = new HashMap<>();
        final Set<String> tools = new HashSet<>();
        int count;

        Builder(Graph graph, Choices choices) {
            this.graph = graph;
            this.choices = choices;
        }

        Draft node(Reference target, BigDecimal amount, boolean notConsumed, Deque<String> path, int depth) {
            if (++count > MAX_NODES || depth > MAX_DEPTH) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "crafting-tree-too-large",
                        "A árvore passou de " + MAX_NODES + " nós ou " + MAX_DEPTH + " níveis", Map.of());
            }
            Draft draft = new Draft(target, amount, notConsumed);
            ids.add(target.extId());

            if ("category".equals(target.kind())) {
                List<Reference> members = graph.categoryMembers.getOrDefault(target.extId(), List.of());
                members.forEach(member -> ids.add(member.extId()));
                Reference chosen = choices.categories().get(target.extId());
                if (chosen == null && members.size() == 1) {
                    chosen = members.getFirst();
                }
                if (chosen == null) {
                    draft.source = "category";
                    draft.options = members;
                    return draft;
                }
                Draft resolved = node(chosen, amount, notConsumed, path, depth);
                resolved.category = target.extId();
                resolved.options = members;
                return resolved;
            }

            // O que sobrou antes vem primeiro. Ferramenta no estoque é usada sem ser gasta.
            draft.fromStock = notConsumed ? available(target).min(amount) : take(target, amount);
            draft.remainder = amount.subtract(draft.fromStock);
            if (draft.remainder.signum() == 0) {
                draft.source = "stock";
                return draft;
            }

            if (path.contains(target.extId())) {
                draft.source = "cycle";
                return draft;
            }

            String choice = choices.product(target);
            List<Output> outputs = matching(graph.producers, target, Output::target).stream()
                    .sorted(Comparator.comparing(Output::recipe)).toList();
            List<Offer> offers = matching(graph.offers, target, Offer::target).stream()
                    .sorted(Comparator.comparing(Offer::unitPrice)).toList();
            List<BasePrice> prices = matching(graph.prices, target, BasePrice::target);
            draft.alternatives = outputs.stream().map(Output::recipe).distinct().toList();
            draft.buyable = !offers.isEmpty();

            boolean recipeChosen = choice != null && !choice.equals("buy") && !choice.equals("base");
            if (recipeChosen && outputs.stream().noneMatch(output -> output.recipe().equals(choice))) {
                throw ApiException.badRequest("choices: a receita \"" + choice + "\" não produz \"" + target.extId() + "\"");
            }
            if ("buy".equals(choice) && offers.isEmpty()) {
                throw ApiException.badRequest("choices: \"" + target.extId() + "\" não é vendido em loja");
            }

            path.push(target.extId());
            try {
                if ("base".equals(choice)) {
                    draft.source = "base";
                } else if (!"buy".equals(choice) && !outputs.isEmpty()) {
                    craft(draft, recipeChosen
                            ? outputs.stream().filter(o -> o.recipe().equals(choice)).findFirst().orElseThrow()
                            : outputs.getFirst(), path, depth);
                } else if (!offers.isEmpty()) {
                    buy(draft, offers.getFirst(), path, depth);
                } else if (!prices.isEmpty()) {
                    BasePrice price = prices.getFirst();
                    draft.source = "price";
                    draft.basePrice = price;
                    draft.cost = draft.remainder.multiply(price.price()).stripTrailingZeros();
                    spend(draft, price.currency(), path, depth);
                } else {
                    draft.source = "base";
                }
            } finally {
                path.pop();
            }

            if (notConsumed) {
                // Obtida uma vez, a ferramenta continua com o jogador.
                put(target, draft.remainder);
                tools.add(key(target));
            }
            return draft;
        }

        private void craft(Draft draft, Output output, Deque<String> path, int depth) {
            RecipeRow recipe = graph.recipes.get(output.recipe());
            BigDecimal batches = draft.remainder.divide(output.amount(), 0, RoundingMode.CEILING);
            draft.source = "recipe";
            draft.recipe = output.recipe();
            draft.batches = batches;
            draft.produced = batches.multiply(output.amount()).stripTrailingZeros();
            draft.craftTime = recipe.craftTimeSeconds() == null ? null
                    : batches.multiply(BigDecimal.valueOf(recipe.craftTimeSeconds())).stripTrailingZeros();
            draft.stations = recipe.stations();
            ids.add(output.recipe());
            ids.addAll(recipe.stations());

            for (Input input : recipe.inputs()) {
                BigDecimal need = input.notConsumed() ? input.amount()
                        : input.amount().multiply(batches).stripTrailingZeros();
                draft.children.add(node(input.target(), need, input.notConsumed(), path, depth + 1));
            }

            draft.leftover = draft.produced.subtract(draft.remainder);
            put(draft.target, draft.leftover);
            // Subproduto certo da receita também sobra; com chance, não dá para contar com ele.
            for (Output other : recipe.outputs()) {
                if (other != output && (other.chance() == null || other.chance().compareTo(BigDecimal.ONE) >= 0)) {
                    put(other.target(), other.amount().multiply(batches));
                    ids.add(other.target().extId());
                }
            }
        }

        private void buy(Draft draft, Offer offer, Deque<String> path, int depth) {
            BigDecimal packSize = offer.quantity() == null ? BigDecimal.ONE : offer.quantity();
            BigDecimal packs = draft.remainder.divide(packSize, 0, RoundingMode.CEILING);
            draft.source = "shop";
            draft.offer = offer;
            draft.packs = packs;
            draft.cost = packs.multiply(offer.price()).stripTrailingZeros();
            ids.add(offer.shopCategory());
            if (offer.shop() != null) {
                ids.add(offer.shop());
            }
            spend(draft, offer.currency(), path, depth);
            draft.leftover = packs.multiply(packSize).subtract(draft.remainder);
            put(draft.target, draft.leftover);
        }

        /** Moeda que é conteúdo vira filho com o valor gasto. */
        private void spend(Draft draft, Reference currency, Deque<String> path, int depth) {
            if (currency != null && draft.cost.signum() > 0) {
                draft.children.add(node(currency, draft.cost, false, path, depth + 1));
            }
        }

        private BigDecimal available(Reference target) {
            return stock.entrySet().stream()
                    .filter(entry -> sameTarget(stockTargets.get(entry.getKey()), target))
                    .map(Map.Entry::getValue)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        private BigDecimal take(Reference target, BigDecimal need) {
            BigDecimal taken = BigDecimal.ZERO;
            for (Map.Entry<String, BigDecimal> entry : stock.entrySet()) {
                if (taken.compareTo(need) >= 0) {
                    break;
                }
                if (entry.getValue().signum() > 0 && sameTarget(stockTargets.get(entry.getKey()), target)) {
                    BigDecimal use = entry.getValue().min(need.subtract(taken));
                    entry.setValue(entry.getValue().subtract(use));
                    taken = taken.add(use);
                }
            }
            return taken;
        }

        private void put(Reference target, BigDecimal amount) {
            if (amount.signum() > 0) {
                stock.merge(key(target), amount, BigDecimal::add);
                stockTargets.putIfAbsent(key(target), target);
            }
        }
    }

    /** Mesmo alvo: mesmo código, e tipos iguais ou algum deles sem tipo. */
    private static boolean sameTarget(Reference a, Reference b) {
        return a.extId().equals(b.extId()) && (a.kind() == null || b.kind() == null || a.kind().equals(b.kind()));
    }

    private static <T> List<T> matching(Map<String, List<T>> byExtId, Reference target, Function<T, Reference> of) {
        return byExtId.getOrDefault(target.extId(), List.of()).stream()
                .filter(row -> sameTarget(of.apply(row), target))
                .toList();
    }

    private Graph load(String gameId) {
        Graph graph = new Graph();

        jdbc.sql("""
                SELECT recipe_ext_id, target_kind, target_ext_id, amount, not_consumed FROM recipe_input
                WHERE game_id = :game ORDER BY recipe_ext_id, ordinal
                """).param("game", gameId).query(rs -> {
            graph.inputs.computeIfAbsent(rs.getString("recipe_ext_id"), key -> new ArrayList<>())
                    .add(new Input(reference(rs.getString("target_kind"), rs.getString("target_ext_id")),
                            rs.getBigDecimal("amount"), rs.getBoolean("not_consumed")));
        });
        jdbc.sql("SELECT recipe_ext_id, station_ext_id FROM recipe_station WHERE game_id = :game ORDER BY recipe_ext_id, ordinal")
                .param("game", gameId).query(rs -> {
                    graph.stations.computeIfAbsent(rs.getString("recipe_ext_id"), key -> new ArrayList<>())
                            .add(rs.getString("station_ext_id"));
                });
        jdbc.sql("""
                SELECT recipe_ext_id, target_kind, target_ext_id, amount, chance FROM recipe_output
                WHERE game_id = :game ORDER BY recipe_ext_id, ordinal
                """).param("game", gameId).query(rs -> {
            graph.outputs.computeIfAbsent(rs.getString("recipe_ext_id"), key -> new ArrayList<>())
                    .add(new Output(rs.getString("recipe_ext_id"),
                            reference(rs.getString("target_kind"), rs.getString("target_ext_id")),
                            rs.getBigDecimal("amount"), rs.getBigDecimal("chance")));
        });
        jdbc.sql("SELECT ext_id, craft_time_seconds FROM recipe WHERE game_id = :game").param("game", gameId).query(rs -> {
            String id = rs.getString("ext_id");
            List<Output> outputs = graph.outputs.getOrDefault(id, List.of());
            graph.recipes.put(id, new RecipeRow((Integer) rs.getObject("craft_time_seconds"),
                    graph.inputs.getOrDefault(id, List.of()), graph.stations.getOrDefault(id, List.of()), outputs));
            outputs.forEach(output -> graph.producers
                    .computeIfAbsent(output.target().extId(), key -> new ArrayList<>()).add(output));
        });
        jdbc.sql("""
                SELECT i.category_ext_id, c.shop_ext_id, i.target_kind, i.target_ext_id, i.quantity, i.purchase_limit,
                       i.price, i.currency_kind, i.currency_ext_id, i.reset_type
                FROM shop_category_item i
                LEFT JOIN shop_category c ON c.game_id = i.game_id AND c.ext_id = i.category_ext_id
                WHERE i.game_id = :game AND i.price IS NOT NULL
                ORDER BY i.category_ext_id, i.ordinal
                """).param("game", gameId).query(rs -> {
            String currency = rs.getString("currency_ext_id");
            graph.offers.computeIfAbsent(rs.getString("target_ext_id"), key -> new ArrayList<>())
                    .add(new Offer(rs.getString("category_ext_id"), rs.getString("shop_ext_id"),
                            reference(rs.getString("target_kind"), rs.getString("target_ext_id")),
                            rs.getBigDecimal("quantity"), (Integer) rs.getObject("purchase_limit"),
                            rs.getBigDecimal("price"),
                            currency == null ? null : reference(rs.getString("currency_kind"), currency),
                            rs.getString("reset_type")));
        });
        jdbc.sql("""
                SELECT 'item' AS kind, ext_id, base_buy_price, currency_kind, currency_ext_id FROM item
                WHERE game_id = :game AND base_buy_price IS NOT NULL
                UNION ALL
                SELECT 'entity', ext_id, base_buy_price, NULL, NULL FROM entity
                WHERE game_id = :game AND base_buy_price IS NOT NULL
                """).param("game", gameId).query(rs -> {
            String currency = rs.getString("currency_ext_id");
            graph.prices.computeIfAbsent(rs.getString("ext_id"), key -> new ArrayList<>())
                    .add(new BasePrice(reference(rs.getString("kind"), rs.getString("ext_id")),
                            rs.getBigDecimal("base_buy_price"),
                            currency == null ? null : reference(rs.getString("currency_kind"), currency)));
        });
        jdbc.sql("""
                SELECT category_ext_id, kind, ext_id FROM content_category
                WHERE game_id = :game AND kind IN ('item', 'entity')
                ORDER BY category_ext_id, ext_id
                """).param("game", gameId).query(rs -> {
            graph.categoryMembers.computeIfAbsent(rs.getString("category_ext_id"), key -> new ArrayList<>())
                    .add(reference(rs.getString("kind"), rs.getString("ext_id")));
        });
        return graph;
    }

    private Map<String, List<NameRow>> names(String gameId, Set<String> ids) {
        Map<String, List<NameRow>> names = new HashMap<>();
        if (ids.isEmpty()) {
            return names;
        }
        jdbc.sql("""
                SELECT kind, ext_id, name, icon_media_id FROM content_ref
                WHERE game_id = :game AND ext_id IN (:ids)
                ORDER BY ext_id, kind
                """)
                .param("game", gameId).param("ids", ids)
                .query(rs -> {
                    names.computeIfAbsent(rs.getString("ext_id"), key -> new ArrayList<>())
                            .add(new NameRow(rs.getString("kind"), rs.getString("name"), rs.getString("icon_media_id")));
                });
        return names;
    }

    private static NameRow find(Map<String, List<NameRow>> names, String kind, String extId) {
        return names.getOrDefault(extId, List.of()).stream()
                .filter(row -> kind == null || row.kind().equals(kind))
                .findFirst().orElse(null);
    }

    private static ResolvedReference resolved(Map<String, List<NameRow>> names, Reference reference) {
        NameRow row = find(names, reference.kind(), reference.extId());
        return new ResolvedReference(reference.kind(), reference.extId(), row == null ? null : row.kind(),
                row == null ? null : row.name(), row == null ? null : row.iconMediaId());
    }

    private static Node convert(Draft draft, Map<String, List<NameRow>> names) {
        NameRow row = find(names, draft.target.kind(), draft.target.extId());
        RecipeUse recipe = null;
        if (draft.recipe != null) {
            NameRow recipeRow = find(names, "recipe", draft.recipe);
            recipe = new RecipeUse(draft.recipe, recipeRow == null ? null : recipeRow.name(), draft.batches,
                    draft.produced, draft.craftTime,
                    draft.stations.stream().map(station -> resolved(names, new Reference("entity", station))).toList());
        }
        Purchase purchase = null;
        if (draft.offer != null) {
            Offer offer = draft.offer;
            purchase = new Purchase(offer.shopCategory(), offer.shop(), draft.packs,
                    offer.quantity() == null ? BigDecimal.ONE : offer.quantity(), offer.price(), offer.currency(),
                    draft.cost, offer.purchaseLimit(), offer.resetType());
        }
        return new Node(
                draft.target,
                row == null ? null : row.name(),
                row == null ? null : row.iconMediaId(),
                draft.amount,
                draft.fromStock.signum() == 0 ? null : draft.fromStock,
                draft.leftover.signum() == 0 ? null : draft.leftover.stripTrailingZeros(),
                draft.notConsumed ? Boolean.TRUE : null,
                draft.source,
                draft.category,
                draft.options == null ? null : draft.options.stream().map(option -> resolved(names, option)).toList(),
                recipe,
                draft.alternatives.isEmpty() ? null : draft.alternatives,
                draft.buyable ? Boolean.TRUE : null,
                purchase,
                draft.basePrice == null ? null
                        : new Price(draft.basePrice.price(), draft.basePrice.currency(), draft.cost),
                draft.children.isEmpty() ? null : draft.children.stream().map(child -> convert(child, names)).toList());
    }

    private static Totals totals(Draft root, Builder builder, Map<String, List<NameRow>> names) {
        Accumulator sum = new Accumulator();
        sum.visit(root);

        Map<String, BigDecimal> leftovers = new LinkedHashMap<>();
        builder.stock.forEach((key, amount) -> {
            if (amount.signum() > 0 && !builder.tools.contains(key)) {
                leftovers.put(key, amount);
                sum.targets.putIfAbsent(key, builder.stockTargets.get(key));
            }
        });

        List<PurchaseTotal> purchases = sum.purchases.values().stream().map(p -> {
            NameRow row = find(names, p.target().kind(), p.target().extId());
            return new PurchaseTotal(p.target(), row == null ? null : row.name(), p.shopCategory(), p.shop(), p.packs(),
                    p.cost(), p.currency());
        }).toList();
        List<RecipeTotal> recipes = sum.recipes.entrySet().stream().map(entry -> {
            NameRow row = find(names, "recipe", entry.getKey());
            return new RecipeTotal(entry.getKey(), row == null ? null : row.name(), entry.getValue());
        }).toList();
        List<ResolvedReference> stations = sum.stations.stream()
                .map(station -> resolved(names, new Reference("entity", station))).toList();

        return new Totals(
                amounts(sum.base, sum.targets, names),
                amounts(sum.tools, sum.targets, names),
                amounts(leftovers, sum.targets, names),
                purchases, recipes, stations, sum.craftTime,
                amounts(sum.open, sum.targets, names),
                List.copyOf(sum.cycles),
                sum.costWithoutCurrency.signum() == 0 ? null : sum.costWithoutCurrency);
    }

    private static List<Amount> amounts(Map<String, BigDecimal> values, Map<String, Reference> targets,
                                        Map<String, List<NameRow>> names) {
        return values.entrySet().stream().map(entry -> {
            Reference target = targets.get(entry.getKey());
            NameRow row = find(names, target.kind(), target.extId());
            return new Amount(target, row == null ? null : row.name(), row == null ? null : row.iconMediaId(),
                    entry.getValue().stripTrailingZeros());
        }).toList();
    }

    private static final class Accumulator {
        final Map<String, Reference> targets = new HashMap<>();
        final Map<String, BigDecimal> base = new LinkedHashMap<>();
        final Map<String, BigDecimal> tools = new LinkedHashMap<>();
        final Map<String, BigDecimal> open = new LinkedHashMap<>();
        final Map<String, PurchaseTotal> purchases = new LinkedHashMap<>();
        final Map<String, BigDecimal> recipes = new LinkedHashMap<>();
        final Set<String> stations = new LinkedHashSet<>();
        final Set<Reference> cycles = new LinkedHashSet<>();
        BigDecimal craftTime = BigDecimal.ZERO;
        BigDecimal costWithoutCurrency = BigDecimal.ZERO;

        void visit(Draft draft) {
            String key = key(draft.target);
            targets.putIfAbsent(key, draft.target);
            if (draft.notConsumed) {
                tools.merge(key, draft.amount, BigDecimal::max);
            }
            switch (draft.source) {
                case "stock" -> {
                    // Já contado onde foi produzido ou comprado.
                }
                case "base" -> {
                    if (!draft.notConsumed) {
                        base.merge(key, draft.remainder, BigDecimal::add);
                    }
                }
                case "category" -> open.merge(key, draft.amount, BigDecimal::add);
                case "cycle" -> cycles.add(draft.target);
                case "recipe" -> {
                    recipes.merge(draft.recipe, draft.batches, BigDecimal::add);
                    stations.addAll(draft.stations);
                    if (draft.craftTime != null) {
                        craftTime = craftTime.add(draft.craftTime);
                    }
                }
                case "shop" -> {
                    Offer offer = draft.offer;
                    purchases.merge(key + " " + offer.shopCategory(),
                            new PurchaseTotal(draft.target, null, offer.shopCategory(), offer.shop(), draft.packs,
                                    draft.cost, offer.currency()),
                            (a, b) -> new PurchaseTotal(a.target(), null, a.shopCategory(), a.shop(),
                                    a.packs().add(b.packs()), a.cost().add(b.cost()), a.currency()));
                    if (offer.currency() == null) {
                        costWithoutCurrency = costWithoutCurrency.add(draft.cost);
                    }
                }
                case "price" -> {
                    if (draft.basePrice.currency() == null) {
                        costWithoutCurrency = costWithoutCurrency.add(draft.cost);
                    }
                }
                default -> throw new IllegalStateException("Origem desconhecida: " + draft.source);
            }
            draft.children.forEach(this::visit);
        }
    }

    private static Reference reference(String kind, String extId) {
        return new Reference(kind, extId);
    }

    private static String key(Reference target) {
        return (target.kind() == null ? "" : target.kind()) + ":" + target.extId();
    }
}
