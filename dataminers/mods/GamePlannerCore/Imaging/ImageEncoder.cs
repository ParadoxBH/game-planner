using System;
using UnityEngine;

namespace GamePlanner.Core.Imaging
{
    /// <summary>Texture2D de/para bytes de arquivo (PNG, JPG). Só na thread principal.</summary>
    public static class ImageEncoder
    {
        /// <summary>PNG da textura. Se ela não for legível, codifica uma cópia e a descarta.</summary>
        public static byte[] ToPng(Texture2D texture)
        {
            return WithReadable(texture, readable => readable.EncodeToPNG());
        }

        /// <summary>JPG da textura, quality de 1 a 100. Perde a transparência.</summary>
        public static byte[] ToJpg(Texture2D texture, int quality = 90)
        {
            return WithReadable(texture, readable => readable.EncodeToJPG(Mathf.Clamp(quality, 1, 100)));
        }

        /// <summary>PNG ou JPG para uma Texture2D nova. Quem chama destrói o resultado.</summary>
        public static Texture2D FromBytes(byte[] data, bool markNonReadable = false)
        {
            if (data == null || data.Length == 0) throw new ArgumentException("Imagem vazia", nameof(data));
            var texture = new Texture2D(2, 2, TextureFormat.RGBA32, false);
            if (!texture.LoadImage(data, markNonReadable))
            {
                UnityEngine.Object.Destroy(texture);
                throw new ArgumentException("Bytes não são PNG nem JPG válidos", nameof(data));
            }
            return texture;
        }

        private static byte[] WithReadable(Texture2D texture, Func<Texture2D, byte[]> encode)
        {
            if (texture == null) throw new ArgumentNullException(nameof(texture));
            Texture2D readable = ReadableTexture.EnsureReadable(texture);
            try
            {
                return encode(readable);
            }
            finally
            {
                if (!ReferenceEquals(readable, texture)) UnityEngine.Object.Destroy(readable);
            }
        }
    }
}
