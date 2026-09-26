using System;
using System.Collections.Generic;
using GamePlanner.Core.Mining;
using Microsoft.Xna.Framework;
using Microsoft.Xna.Framework.Graphics;
using ReLogic.Content;
using Terraria;
using Terraria.GameContent;

namespace GamePlannerTerraria.Imaging
{
    /// <summary>
    /// Ícones do dataset: equivale ao SpriteImageCollector do Core, mas lendo Texture2D do XNA/FNA em vez de
    /// Sprite da Unity. Uma conversão por chave — o mesmo item nunca é lido duas vezes.
    ///
    /// Só na thread principal: ler pixel de textura é chamada de GPU. Com o jogo em servidor dedicado não há
    /// textura nenhuma, e todo mundo devolve null.
    /// </summary>
    internal sealed class TextureImages
    {
        private readonly MinedDataset _dataset;
        private readonly MiningContext _context;
        private readonly Dictionary<string, string> _chaves = new Dictionary<string, string>();

        /// <summary>Conversões feitas desde o último Reset. O minerador usa para decidir quando dar yield.</summary>
        public int ConvertidasDesdeOYield { get; private set; }

        public TextureImages(MinedDataset dataset, MiningContext context)
        {
            _dataset = dataset;
            _context = context;
        }

        public bool Ligado => _context.IncludeImages && !Main.dedServ;

        public void ReiniciarContagem() => ConvertidasDesdeOYield = 0;

        /// <summary>Ícone do item. O quadro 0 basta: item animado repete o mesmo desenho.</summary>
        public string Item(int type, string extId)
        {
            if (!Ligado || type <= 0 || string.IsNullOrEmpty(extId)) return null;
            return Coletar("item/" + extId, () =>
            {
                Main.instance.LoadItem(type);
                Asset<Texture2D> asset = type < TextureAssets.Item.Length ? TextureAssets.Item[type] : null;
                Texture2D textura = Valor(asset);
                if (textura == null) return null;

                int quadros = Quadros(Main.itemAnimations, type);
                return Recortar(textura, quadros);
            });
        }

        /// <summary>Ícone do NPC, primeiro quadro da folha de animação.</summary>
        public string Npc(int type, string extId)
        {
            if (!Ligado || type <= 0 || string.IsNullOrEmpty(extId)) return null;
            return Coletar("npc/" + extId, () =>
            {
                Main.instance.LoadNPC(type);
                Asset<Texture2D> asset = type < TextureAssets.Npc.Length ? TextureAssets.Npc[type] : null;
                Texture2D textura = Valor(asset);
                if (textura == null) return null;

                int quadros = type < Main.npcFrameCount.Length ? Math.Max(1, Main.npcFrameCount[type]) : 1;
                return Recortar(textura, quadros);
            });
        }

        // ------------------------------------------------------------------ conversão

        private string Coletar(string chave, Func<byte[]> converter)
        {
            if (_chaves.TryGetValue(chave, out string existente)) return existente;

            string resultado = null;
            try
            {
                byte[] png = converter();
                if (png != null)
                {
                    _dataset.Images[chave] = png;
                    resultado = chave;
                    ConvertidasDesdeOYield++;
                }
            }
            catch (Exception e)
            {
                _dataset.Warn("Imagem '" + chave + "' não convertida: " + e.Message);
            }
            _chaves[chave] = resultado;
            return resultado;
        }

        private static Texture2D Valor(Asset<Texture2D> asset)
        {
            if (asset == null || !asset.IsLoaded) return null;
            Texture2D textura = asset.Value;
            return textura == null || textura.IsDisposed || textura.Width <= 0 || textura.Height <= 0 ? null : textura;
        }

        private static int Quadros(Terraria.DataStructures.DrawAnimation[] animacoes, int type)
        {
            if (animacoes == null || type >= animacoes.Length) return 1;
            Terraria.DataStructures.DrawAnimation animacao = animacoes[type];
            return animacao == null ? 1 : Math.Max(1, animacao.FrameCount);
        }

        /// <summary>Primeiro quadro, sem a moldura transparente em volta e, se for grande demais, reduzido.</summary>
        private byte[] Recortar(Texture2D textura, int quadros)
        {
            int altura = Math.Max(1, textura.Height / quadros);
            var quadro = new Rectangle(0, 0, textura.Width, altura);
            var pixels = new Color[quadro.Width * quadro.Height];
            textura.GetData(0, quadro, pixels, 0, pixels.Length);

            if (!Limites(pixels, quadro.Width, quadro.Height, out int x0, out int y0, out int x1, out int y1)) return null;
            int largura = x1 - x0 + 1;
            int alturaUtil = y1 - y0 + 1;

            byte[] rgba = Bytes(pixels, quadro.Width, x0, y0, largura, alturaUtil);

            int maior = Math.Max(largura, alturaUtil);
            int limite = Math.Max(32, _context.MaxImageSize);
            if (maior > limite)
            {
                int destinoLargura = Math.Max(1, largura * limite / maior);
                int destinoAltura = Math.Max(1, alturaUtil * limite / maior);
                rgba = Reduzir(rgba, largura, alturaUtil, destinoLargura, destinoAltura);
                largura = destinoLargura;
                alturaUtil = destinoAltura;
            }
            return PngEncoder.Encode(rgba, largura, alturaUtil);
        }

        /// <summary>Retângulo do que não é transparente. false quando o quadro é todo vazio.</summary>
        private static bool Limites(Color[] pixels, int largura, int altura, out int x0, out int y0, out int x1, out int y1)
        {
            x0 = largura;
            y0 = altura;
            x1 = -1;
            y1 = -1;
            for (int y = 0; y < altura; y++)
            {
                int linha = y * largura;
                for (int x = 0; x < largura; x++)
                {
                    if (pixels[linha + x].A == 0) continue;
                    if (x < x0) x0 = x;
                    if (x > x1) x1 = x;
                    if (y < y0) y0 = y;
                    if (y > y1) y1 = y;
                }
            }
            return x1 >= x0 && y1 >= y0;
        }

        /// <summary>
        /// Recorte em bytes RGBA, desfazendo o alfa pré-multiplicado: o Terraria guarda a textura com a cor já
        /// multiplicada pelo alfa, e PNG espera a cor original.
        /// </summary>
        private static byte[] Bytes(Color[] pixels, int larguraOriginal, int x0, int y0, int largura, int altura)
        {
            var rgba = new byte[largura * altura * 4];
            for (int y = 0; y < altura; y++)
            {
                int origem = (y0 + y) * larguraOriginal + x0;
                int destino = y * largura * 4;
                for (int x = 0; x < largura; x++)
                {
                    Color cor = pixels[origem + x];
                    byte a = cor.A;
                    if (a == 0)
                    {
                        destino += 4;
                        continue;
                    }
                    rgba[destino++] = a == 255 ? cor.R : (byte)Math.Min(255, cor.R * 255 / a);
                    rgba[destino++] = a == 255 ? cor.G : (byte)Math.Min(255, cor.G * 255 / a);
                    rgba[destino++] = a == 255 ? cor.B : (byte)Math.Min(255, cor.B * 255 / a);
                    rgba[destino++] = a;
                }
            }
            return rgba;
        }

        /// <summary>Redução por média da área de origem. Só entra em cena com textura grande (chefe, por exemplo).</summary>
        private static byte[] Reduzir(byte[] rgba, int largura, int altura, int destinoLargura, int destinoAltura)
        {
            var destino = new byte[destinoLargura * destinoAltura * 4];
            for (int y = 0; y < destinoAltura; y++)
            {
                int origemY0 = y * altura / destinoAltura;
                int origemY1 = Math.Max(origemY0 + 1, (y + 1) * altura / destinoAltura);
                for (int x = 0; x < destinoLargura; x++)
                {
                    int origemX0 = x * largura / destinoLargura;
                    int origemX1 = Math.Max(origemX0 + 1, (x + 1) * largura / destinoLargura);
                    long r = 0, g = 0, b = 0, a = 0;
                    int total = 0;
                    for (int oy = origemY0; oy < origemY1; oy++)
                    {
                        int linha = (oy * largura + origemX0) * 4;
                        for (int ox = origemX0; ox < origemX1; ox++, linha += 4)
                        {
                            byte alfa = rgba[linha + 3];
                            r += rgba[linha] * alfa;
                            g += rgba[linha + 1] * alfa;
                            b += rgba[linha + 2] * alfa;
                            a += alfa;
                            total++;
                        }
                    }
                    int posicao = (y * destinoLargura + x) * 4;
                    // Média com peso do alfa: pixel transparente não puxa a cor da borda para preto.
                    destino[posicao] = a == 0 ? (byte)0 : (byte)(r / a);
                    destino[posicao + 1] = a == 0 ? (byte)0 : (byte)(g / a);
                    destino[posicao + 2] = a == 0 ? (byte)0 : (byte)(b / a);
                    destino[posicao + 3] = total == 0 ? (byte)0 : (byte)(a / total);
                }
            }
            return destino;
        }
    }
}
