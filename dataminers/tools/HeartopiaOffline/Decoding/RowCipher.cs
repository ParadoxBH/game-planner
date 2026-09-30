using System;
using System.Collections.Generic;
using System.Text;

namespace GamePlanner.HeartopiaOffline.Decoding
{
    /// <summary>
    /// Ofuscação das células dos .db do jogo (ResIndex, designTable, dialogueTable): XOR com uma chave de 16 bytes
    /// que gira por linha — o byte i da célula usa key[(i + |hash| % 16) % 16], com hash = chave primária da linha.
    ///
    /// A chave NÃO fica no código: é deduzida na hora por texto conhecido. Todo caminho do ResIndex começa com
    /// "Assets/", então cada linha revela 7 bytes da chave a partir da posição da linha, e as linhas juntas cobrem
    /// as 16. Se a XD trocar a chave num patch, a dedução acompanha; se trocar o esquema, a validação reprova e a
    /// ferramenta para em vez de gerar lixo.
    /// </summary>
    public sealed class RowCipher
    {
        public const int KeyLength = 16;
        private const string KnownPrefix = "Assets/";

        private static readonly UTF8Encoding StrictUtf8 = new UTF8Encoding(false, throwOnInvalidBytes: true);

        private readonly byte[] _key;

        /// <summary>Linhas usadas na dedução e a fração de votos que concordou com o byte escolhido.</summary>
        public readonly int SampleRows;
        public readonly double Agreement;

        private RowCipher(byte[] key, int sampleRows, double agreement)
        {
            _key = key;
            SampleRows = sampleRows;
            Agreement = agreement;
        }

        public static int Offset(long hash) => (int)(Math.Abs(hash) % KeyLength);

        /// <summary>Deduz a chave a partir das células de caminho do ResIndex (hash, bytes).</summary>
        public static RowCipher Derive(IEnumerable<(long Hash, byte[] Path)> rows)
        {
            byte[] prefix = Encoding.ASCII.GetBytes(KnownPrefix);
            var votes = new int[KeyLength, 256];
            int sampleRows = 0;

            foreach ((long hash, byte[] path) in rows)
            {
                if (path == null || path.Length < prefix.Length) continue;
                int offset = Offset(hash);
                for (int i = 0; i < prefix.Length; i++)
                    votes[(i + offset) % KeyLength, path[i] ^ prefix[i]]++;
                sampleRows++;
            }

            var key = new byte[KeyLength];
            long agreeing = 0, total = 0;
            for (int pos = 0; pos < KeyLength; pos++)
            {
                int best = 0, bestVotes = -1, posTotal = 0;
                for (int b = 0; b < 256; b++)
                {
                    posTotal += votes[pos, b];
                    if (votes[pos, b] > bestVotes) { best = b; bestVotes = votes[pos, b]; }
                }
                if (posTotal == 0)
                    throw new InvalidOperationException($"Posição {pos} da chave sem nenhuma amostra: o ResIndex não tem linhas suficientes.");
                key[pos] = (byte)best;
                agreeing += bestVotes;
                total += posTotal;
            }

            return new RowCipher(key, sampleRows, total == 0 ? 0 : (double)agreeing / total);
        }

        public byte[] Decode(long hash, byte[] cell)
        {
            if (cell == null) return null;
            int offset = Offset(hash);
            var plain = new byte[cell.Length];
            for (int i = 0; i < cell.Length; i++) plain[i] = (byte)(cell[i] ^ _key[(i + offset) % KeyLength]);
            return plain;
        }

        /// <summary>Texto da célula, ou null se ela não virar UTF-8 válido (sinal de chave ou esquema errados).</summary>
        public string DecodeString(long hash, byte[] cell)
        {
            if (cell == null) return null;
            try
            {
                return StrictUtf8.GetString(Decode(hash, cell));
            }
            catch (DecoderFallbackException)
            {
                return null;
            }
        }
    }
}
