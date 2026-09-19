using UnityEngine;

namespace GamePlanner.Core.Imaging
{
    /// <summary>Redimensionamento na GPU (bilinear). Só na thread principal.</summary>
    public static class TextureResizer
    {
        /// <summary>Nova textura em width x height. Quem chama destrói o resultado.</summary>
        public static Texture2D Resize(Texture source, int width, int height)
        {
            return ReadableTexture.Copy(source, width, height, Vector2.one, Vector2.zero);
        }

        /// <summary>Reduz para o maior lado caber em maxSize, mantendo a proporção. Nunca amplia.</summary>
        public static Texture2D FitWithin(Texture source, int maxSize)
        {
            int width = source.width;
            int height = source.height;
            FitWithin(ref width, ref height, maxSize);
            return Resize(source, width, height);
        }

        /// <summary>Só a conta: ajusta width e height para caber em maxSize. maxSize &lt;= 0 não mexe.</summary>
        public static void FitWithin(ref int width, ref int height, int maxSize)
        {
            if (maxSize <= 0 || (width <= maxSize && height <= maxSize)) return;
            float factor = (float)maxSize / Mathf.Max(width, height);
            width = Mathf.Max(1, Mathf.RoundToInt(width * factor));
            height = Mathf.Max(1, Mathf.RoundToInt(height * factor));
        }
    }
}
