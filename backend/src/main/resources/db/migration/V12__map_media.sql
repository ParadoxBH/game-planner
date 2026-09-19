-- Imagem de mapa enviada pelo usuario. A variante "large" (ate 8192 px) so e gerada quando o
-- upload pede (?large=true): mapa precisa de detalhe no zoom, e 1920 px do "full" nao basta.
-- O uso "map" e o fundo do mapa, separado da miniatura ("thumbnail") da selecao de mapas.

ALTER TABLE media_variant DROP CONSTRAINT media_variant_values;
ALTER TABLE media_variant ADD CONSTRAINT media_variant_values
    CHECK (variant IN ('icon', 'thumb', 'full', 'large'));

ALTER TABLE content_media DROP CONSTRAINT content_media_usage_values;
ALTER TABLE content_media ADD CONSTRAINT content_media_usage_values
    CHECK (usage IN ('icon', 'capsule', 'thumbnail', 'banner', 'screenshot', 'map'));
