package com.paradoxbh.gameplannerserver.content.model;

import java.time.LocalDate;
import java.util.List;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ContentKind;
import com.paradoxbh.gameplannerserver.content.ExtIds;

/**
 * Código de resgate. {@code extId} é o próprio código, como o jogador digita. {@code name} é
 * opcional: sem ele, vale o código. {@code addedOn} e {@code expiresOn} são datas; o código vale
 * até o fim de {@code expiresOn}.
 */
public record RedemptionCodeDocument(
        String extId,
        String name,
        String summary,
        String description,
        List<MediaLink> media,
        LocalDate addedOn,
        LocalDate expiresOn,
        List<Reward> rewards,
        ContentMeta meta) implements ContentDocument<RedemptionCodeDocument> {

    @Override
    public RedemptionCodeDocument canonical(String extId) {
        if (addedOn != null && expiresOn != null && expiresOn.isBefore(addedOn)) {
            throw ApiException.badRequest("expiresOn não pode ser anterior a addedOn");
        }
        return new RedemptionCodeDocument(
                ExtIds.require(extId, "extId"),
                Canon.text(name),
                Canon.text(summary),
                Canon.text(description),
                Canon.media(media, ContentKind.REDEMPTION_CODE.code()),
                addedOn,
                expiresOn,
                Canon.rows(rewards, "rewards", Reward::canonical),
                null);
    }

    @Override
    public RedemptionCodeDocument withMeta(ContentMeta meta) {
        return new RedemptionCodeDocument(extId, name, summary, description, media, addedOn, expiresOn, rewards, meta);
    }

    @Override
    public RedemptionCodeDocument withMedia(List<MediaLink> media) {
        return new RedemptionCodeDocument(extId, name, summary, description, media, addedOn, expiresOn, rewards, meta);
    }
}
