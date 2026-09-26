using System.Text;

namespace GamePlanner.Core.Text
{
    /// <summary>Id de conteúdo aceito pela API: 1 a 128 caracteres, sem / \ ? # % ; nem controle.</summary>
    public static class ExtId
    {
        public const int MaxLength = 128;

        public static string Sanitize(string value)
        {
            if (string.IsNullOrEmpty(value)) return null;
            var sb = new StringBuilder(value.Length);
            foreach (char c in value.Trim())
            {
                if (c == '/' || c == '\\' || c == '?' || c == '#' || c == '%' || c == ';' || char.IsControl(c)) sb.Append('_');
                else sb.Append(c);
            }
            string result = sb.ToString();
            if (result.Length > MaxLength) result = result.Substring(0, MaxLength);
            return result.Length == 0 ? null : result;
        }

        /// <summary>"OneHandedWeapon" -> "one_handed_weapon". Serve para códigos vindos de enum.</summary>
        public static string SnakeCase(string value)
        {
            if (string.IsNullOrEmpty(value)) return value;
            var sb = new StringBuilder(value.Length + 8);
            for (int i = 0; i < value.Length; i++)
            {
                char c = value[i];
                if (char.IsUpper(c))
                {
                    bool boundary = i > 0 && value[i - 1] != '_' &&
                                    (char.IsLower(value[i - 1]) || (i + 1 < value.Length && char.IsLower(value[i + 1])));
                    if (boundary) sb.Append('_');
                    sb.Append(char.ToLowerInvariant(c));
                }
                else sb.Append(c == ' ' || c == '-' ? '_' : c);
            }
            return sb.ToString();
        }
    }
}
