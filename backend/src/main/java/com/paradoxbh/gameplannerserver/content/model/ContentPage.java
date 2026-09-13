package com.paradoxbh.gameplannerserver.content.model;

import java.util.List;

import com.paradoxbh.gameplannerserver.common.ApiException;

/** Página de resultados. {@code page} começa em 0. */
public record ContentPage<T>(List<T> content, int page, int size, long total, int totalPages) {

    public static final int MAX_SIZE = 200;

    public static <T> ContentPage<T> of(List<T> content, int page, int size, long total) {
        return new ContentPage<>(content, page, size, total, (int) ((total + size - 1) / size));
    }

    public static void requireValid(int page, int size) {
        if (page < 0) {
            throw ApiException.badRequest("page começa em 0");
        }
        if (size < 1 || size > MAX_SIZE) {
            throw ApiException.badRequest("size precisa estar entre 1 e " + MAX_SIZE);
        }
    }
}
