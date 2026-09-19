using System.Globalization;
using UnityEngine;

namespace GamePlanner.Core.Imaging
{
    /// <summary>Color da Unity de/para "#RRGGBB" ou "#RRGGBBAA", o formato de cor da API (ex.: raridade).</summary>
    public static class ColorHex
    {
        public static string ToHex(Color color, bool includeAlpha = false)
        {
            Color32 c = color;
            string hex = "#" + c.r.ToString("X2") + c.g.ToString("X2") + c.b.ToString("X2");
            return includeAlpha ? hex + c.a.ToString("X2") : hex;
        }

        public static bool TryParse(string hex, out Color color)
        {
            color = Color.white;
            if (string.IsNullOrEmpty(hex)) return false;
            string value = hex.TrimStart('#');
            if (value.Length != 6 && value.Length != 8) return false;
            if (!uint.TryParse(value, NumberStyles.HexNumber, CultureInfo.InvariantCulture, out uint raw)) return false;
            if (value.Length == 6) raw = (raw << 8) | 0xFF;
            color = new Color32((byte)(raw >> 24), (byte)(raw >> 16), (byte)(raw >> 8), (byte)raw);
            return true;
        }
    }
}
