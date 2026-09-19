using System.Security.Cryptography;
using System.Text;

namespace GamePlanner.Core.Hashing
{
    /// <summary>SHA-256 em hexadecimal minúsculo: a chave do cache de imagens já enviadas.</summary>
    public static class Sha256Hex
    {
        public static string Of(byte[] data)
        {
            using (SHA256 sha = SHA256.Create())
            {
                byte[] hash = sha.ComputeHash(data);
                var sb = new StringBuilder(hash.Length * 2);
                foreach (byte b in hash) sb.Append(b.ToString("x2"));
                return sb.ToString();
            }
        }
    }
}
