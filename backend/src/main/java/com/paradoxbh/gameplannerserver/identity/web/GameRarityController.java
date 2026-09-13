package com.paradoxbh.gameplannerserver.identity.web;

import java.util.List;
import java.util.regex.Pattern;

import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.paradoxbh.gameplannerserver.common.ApiException;
import com.paradoxbh.gameplannerserver.content.ExtIds;
import com.paradoxbh.gameplannerserver.identity.domain.GameRarity;
import com.paradoxbh.gameplannerserver.identity.repo.GameRarityRepository;
import com.paradoxbh.gameplannerserver.identity.service.GameAccess;

/** Raridades do jogo. É o que dá significado ao {@code rarityCode} de item e entidade. */
@RestController
@RequestMapping("/api/v1/games/{gameId}/rarities")
public class GameRarityController {

    private static final Pattern COLOR = Pattern.compile("#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?");

    private final GameRarityRepository rarities;
    private final GameAccess access;

    public GameRarityController(GameRarityRepository rarities, GameAccess access) {
        this.rarities = rarities;
        this.access = access;
    }

    @GetMapping
    @Transactional(readOnly = true)
    public List<RarityResponse> list(@PathVariable String gameId) {
        access.requireReadable(gameId);
        return rarities.findByGameIdOrderByOrdinal(gameId).stream().map(RarityResponse::of).toList();
    }

    @PutMapping("/{code}")
    @Transactional
    public RarityResponse put(@PathVariable String gameId, @PathVariable String code,
                              @RequestBody RarityRequest request) {
        access.requireWritable(gameId);
        String validCode = ExtIds.require(code, "code");
        if (request.name() == null || request.name().isBlank()) {
            throw ApiException.badRequest("name é obrigatório");
        }
        if (request.color() == null || !COLOR.matcher(request.color()).matches()) {
            throw ApiException.badRequest("color precisa ser hexadecimal, ex.: #CAC2AD");
        }

        GameRarity rarity = rarities.findById(new GameRarity.Key(gameId, validCode)).orElseGet(GameRarity::new);
        rarity.setGameId(gameId);
        rarity.setCode(validCode);
        rarity.setName(request.name());
        rarity.setColor(request.color());
        rarity.setOrdinal(request.ordinal() == null ? 0 : request.ordinal());
        return RarityResponse.of(rarities.save(rarity));
    }

    @DeleteMapping("/{code}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void delete(@PathVariable String gameId, @PathVariable String code) {
        access.requireModerator(gameId);
        GameRarity.Key key = new GameRarity.Key(gameId, ExtIds.require(code, "code"));
        if (!rarities.existsById(key)) {
            throw ApiException.notFound("Raridade \"" + code + "\"");
        }
        rarities.deleteById(key);
    }

    public record RarityRequest(String name, String color, Integer ordinal) {
    }

    public record RarityResponse(String code, String name, String color, int ordinal) {
        static RarityResponse of(GameRarity rarity) {
            return new RarityResponse(rarity.getCode(), rarity.getName(), rarity.getColor(), rarity.getOrdinal());
        }
    }
}
