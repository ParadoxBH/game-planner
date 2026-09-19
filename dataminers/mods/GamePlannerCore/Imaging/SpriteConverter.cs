using System;
using UnityEngine;

namespace GamePlanner.Core.Imaging
{
    /// <summary>Sprite (normalmente um pedaço de atlas) para uma Texture2D só com ele.</summary>
    public static class SpriteConverter
    {
        /// <summary>
        /// Recorta o sprite do atlas numa textura nova e legível. maxSize limita o maior lado mantendo a
        /// proporção (0 = tamanho original). Sprite empacotado com rotação sai sem desrotacionar.
        /// Quem chama destrói o resultado (Object.Destroy) quando terminar.
        /// </summary>
        public static Texture2D ToTexture2D(Sprite sprite, int maxSize = 0)
        {
            if (sprite == null) throw new ArgumentNullException(nameof(sprite));
            Texture2D atlas = sprite.texture;
            if (atlas == null) throw new ArgumentException("Sprite sem textura: " + sprite.name);

            Rect rect = RectOnAtlas(sprite);
            int width = Mathf.RoundToInt(rect.width);
            int height = Mathf.RoundToInt(rect.height);
            TextureResizer.FitWithin(ref width, ref height, maxSize);

            var scale = new Vector2(rect.width / atlas.width, rect.height / atlas.height);
            var offset = new Vector2(rect.x / atlas.width, rect.y / atlas.height);
            return ReadableTexture.Copy(atlas, width, height, scale, offset);
        }

        /// <summary>Atalho: sprite direto para PNG.</summary>
        public static byte[] ToPng(Sprite sprite, int maxSize = 0)
        {
            Texture2D texture = ToTexture2D(sprite, maxSize);
            try
            {
                return ImageEncoder.ToPng(texture);
            }
            finally
            {
                UnityEngine.Object.Destroy(texture);
            }
        }

        /// <summary>Texture2D inteira como Sprite, com pivô no centro.</summary>
        public static Sprite FromTexture(Texture2D texture, float pixelsPerUnit = 100f)
        {
            if (texture == null) throw new ArgumentNullException(nameof(texture));
            return Sprite.Create(texture, new Rect(0, 0, texture.width, texture.height), new Vector2(0.5f, 0.5f), pixelsPerUnit);
        }

        /// <summary>
        /// Área do sprite no atlas. textureRect lança exceção em sprite empacotado no modo "tight";
        /// nesse caso rect é a melhor aproximação disponível.
        /// </summary>
        public static Rect RectOnAtlas(Sprite sprite)
        {
            try
            {
                return sprite.textureRect;
            }
            catch (Exception)
            {
                return sprite.rect;
            }
        }
    }
}
