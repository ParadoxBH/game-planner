using System;
using System.IO;
using System.IO.Compression;

namespace GamePlannerTerraria.Imaging
{
    /// <summary>
    /// PNG de 8 bits com alfa, escrito na mão. O Core codifica pela Unity (Texture2D.EncodeToPNG); aqui o
    /// equivalente seria Texture2D.SaveAsPng do FNA, que devolve a imagem como está na GPU — com alfa
    /// pré-multiplicado, que é como o Terraria guarda as texturas, e por isso com borda escura em cima de
    /// fundo claro. Como os pixels já precisam de tratamento, sai mais simples escrever o arquivo aqui.
    /// </summary>
    internal static class PngEncoder
    {
        private static readonly byte[] Signature = { 137, 80, 78, 71, 13, 10, 26, 10 };

        private static readonly uint[] CrcTable = BuildCrcTable();

        /// <param name="rgba">width * height * 4 bytes, na ordem R, G, B, A.</param>
        public static byte[] Encode(byte[] rgba, int width, int height)
        {
            if (width <= 0 || height <= 0) throw new ArgumentException("Imagem sem tamanho");
            if (rgba.Length < width * height * 4) throw new ArgumentException("Faltam pixels para " + width + "x" + height);

            using (var file = new MemoryStream(rgba.Length / 2 + 256))
            {
                file.Write(Signature, 0, Signature.Length);

                var header = new byte[13];
                WriteInt(header, 0, width);
                WriteInt(header, 4, height);
                header[8] = 8;  // bits por canal
                header[9] = 6;  // RGBA
                Chunk(file, "IHDR", header, header.Length);

                byte[] compressed = Deflate(rgba, width, height);
                Chunk(file, "IDAT", compressed, compressed.Length);
                Chunk(file, "IEND", Array.Empty<byte>(), 0);
                return file.ToArray();
            }
        }

        /// <summary>Cada linha vai com filtro 0 (sem filtro): sprite pequeno não ganha nada com filtro melhor.</summary>
        private static byte[] Deflate(byte[] rgba, int width, int height)
        {
            int stride = width * 4;
            using (var buffer = new MemoryStream(rgba.Length / 2 + 64))
            {
                using (var zlib = new ZLibStream(buffer, CompressionLevel.Optimal, leaveOpen: true))
                {
                    var zero = new byte[1];
                    for (int y = 0; y < height; y++)
                    {
                        zlib.Write(zero, 0, 1);
                        zlib.Write(rgba, y * stride, stride);
                    }
                }
                return buffer.ToArray();
            }
        }

        private static void Chunk(Stream file, string type, byte[] data, int length)
        {
            var size = new byte[4];
            WriteInt(size, 0, length);
            file.Write(size, 0, 4);

            var name = new byte[4];
            for (int i = 0; i < 4; i++) name[i] = (byte)type[i];
            file.Write(name, 0, 4);
            file.Write(data, 0, length);

            uint crc = Crc(0xFFFFFFFF, name, 4);
            crc = Crc(crc, data, length) ^ 0xFFFFFFFF;
            var tail = new byte[4];
            WriteInt(tail, 0, (int)crc);
            file.Write(tail, 0, 4);
        }

        private static void WriteInt(byte[] target, int offset, int value)
        {
            target[offset] = (byte)(value >> 24);
            target[offset + 1] = (byte)(value >> 16);
            target[offset + 2] = (byte)(value >> 8);
            target[offset + 3] = (byte)value;
        }

        private static uint Crc(uint crc, byte[] data, int length)
        {
            for (int i = 0; i < length; i++) crc = CrcTable[(crc ^ data[i]) & 0xFF] ^ (crc >> 8);
            return crc;
        }

        private static uint[] BuildCrcTable()
        {
            var table = new uint[256];
            for (uint i = 0; i < 256; i++)
            {
                uint c = i;
                for (int bit = 0; bit < 8; bit++) c = (c & 1) != 0 ? 0xEDB88320 ^ (c >> 1) : c >> 1;
                table[i] = c;
            }
            return table;
        }
    }
}
