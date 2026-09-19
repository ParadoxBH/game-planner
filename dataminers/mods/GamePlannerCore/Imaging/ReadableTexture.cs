using UnityEngine;

namespace GamePlanner.Core.Imaging
{
    /// <summary>
    /// Cópia legível de qualquer textura. As texturas de jogo quase sempre vêm sem Read/Write, então
    /// GetPixels e EncodeToPNG falham; a saída é desenhar na GPU (RenderTexture) e ler os pixels de volta.
    /// Só na thread principal.
    /// </summary>
    public static class ReadableTexture
    {
        /// <summary>Textura inteira, no tamanho original.</summary>
        public static Texture2D Copy(Texture source)
        {
            return Copy(source, source.width, source.height, Vector2.one, Vector2.zero);
        }

        /// <summary>
        /// Recorte da textura desenhado em width x height. scale e offset estão em UV (0..1),
        /// no formato do Graphics.Blit: scale = tamanho do recorte, offset = canto inferior esquerdo.
        /// </summary>
        public static Texture2D Copy(Texture source, int width, int height, Vector2 scale, Vector2 offset)
        {
            width = Mathf.Max(1, width);
            height = Mathf.Max(1, height);
            RenderTexture previous = RenderTexture.active;
            RenderTexture target = RenderTexture.GetTemporary(width, height, 0, RenderTextureFormat.ARGB32, RenderTextureReadWrite.Default);
            try
            {
                target.filterMode = FilterMode.Bilinear;
                Graphics.Blit(source, target, scale, offset);
                RenderTexture.active = target;
                var result = new Texture2D(width, height, TextureFormat.RGBA32, false);
                result.ReadPixels(new Rect(0, 0, width, height), 0, 0);
                result.Apply(false, false);
                return result;
            }
            finally
            {
                RenderTexture.active = previous;
                RenderTexture.ReleaseTemporary(target);
            }
        }

        /// <summary>A própria textura se já for legível e RGBA32; senão uma cópia. Compare a referência para saber se precisa destruir.</summary>
        public static Texture2D EnsureReadable(Texture2D source)
        {
            if (source.isReadable && source.format == TextureFormat.RGBA32) return source;
            return Copy(source);
        }
    }
}
