package com.paradoxbh.gameplannerserver.content.store;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.model.ContentMeta;
import com.paradoxbh.gameplannerserver.content.model.RedemptionCodeDocument;
import com.paradoxbh.gameplannerserver.content.model.Reward;
import com.paradoxbh.gameplannerserver.content.store.ChildRows.Table;
import com.paradoxbh.gameplannerserver.query.FieldType;
import com.paradoxbh.gameplannerserver.query.QueryField;

@Component
public class RedemptionCodeHandler extends AbstractContentHandler<RedemptionCodeDocument, Map<String, List<Reward>>> {

    private static final Table REWARDS = Table.of("redemption_reward", "code_ext_id");

    private final ChildRows children;

    public RedemptionCodeHandler(JdbcClient jdbc, ContentTagsRepository tags, ChildRows children) {
        super(jdbc, tags);
        this.children = children;
    }

    @Override
    public ContentKind kind() {
        return ContentKind.REDEMPTION_CODE;
    }

    @Override
    public Class<RedemptionCodeDocument> documentType() {
        return RedemptionCodeDocument.class;
    }

    @Override
    protected List<String> specificColumns() {
        return List.of("added_on", "expires_on");
    }

    @Override
    protected List<Object> specificValues(RedemptionCodeDocument code) {
        return Arrays.asList(code.addedOn(), code.expiresOn());
    }

    @Override
    protected RedemptionCodeDocument map(Map<String, Object> row, ContentTags tags, Map<String, List<Reward>> rewards,
                                         ContentMeta meta) {
        String id = Rows.string(row, "ext_id");
        return new RedemptionCodeDocument(
                id,
                Rows.string(row, "name"),
                Rows.string(row, "summary"),
                Rows.string(row, "description"),
                tags.media(),
                Rows.date(row, "added_on"),
                Rows.date(row, "expires_on"),
                rewards.getOrDefault(id, List.of()),
                meta);
    }

    /** Código de resgate não tem categorias, eventos, atributos nem imagens. */
    @Override
    public ContentTags tagsOf(RedemptionCodeDocument code) {
        return new ContentTags(List.of(), List.of(), Map.of(), code.media());
    }

    @Override
    protected Map<String, List<Reward>> loadChildren(String gameId, List<String> extIds) {
        return children.load(REWARDS, gameId, extIds, row -> new Reward(
                Rows.reference(row, "target_kind", "target_ext_id"), Rows.decimal(row, "amount")));
    }

    @Override
    protected void replaceChildren(String gameId, RedemptionCodeDocument code) {
        children.replace(REWARDS, gameId, code.extId(), code.rewards().stream()
                .map(reward -> ChildRows.row(
                        "target_kind", reward.target().kind(),
                        "target_ext_id", reward.target().extId(),
                        "amount", reward.amount()))
                .toList());
    }

    @Override
    protected void deleteChildren(String gameId, String extId) {
        children.delete(REWARDS, gameId, extId);
    }

    @Override
    protected boolean hasEvents() {
        return false;
    }

    /** active: ainda vale hoje, sem validade ou vencendo hoje ou depois. rewards é "tipo:id" ou "id". */
    @Override
    protected List<QueryField> specificFields() {
        return List.of(
                QueryField.column("addedOn", "Adicionado em", FieldType.DATE, "t.added_on"),
                QueryField.column("expiresOn", "Vence em", FieldType.DATE, "t.expires_on"),
                QueryField.flag("active", "Válido", "t.expires_on IS NULL OR t.expires_on >= current_date"),
                childReference("rewards", "Recompensa", "redemption_reward", "code_ext_id", null));
    }

    @Override
    protected Map<String, String> specificSortColumns() {
        return Map.of("addedOn", "t.added_on", "expiresOn", "t.expires_on");
    }

    /** Sem nome, vale o próprio código. */
    @Override
    protected String nameExpression() {
        return "coalesce(t.name, t.ext_id)";
    }
}
