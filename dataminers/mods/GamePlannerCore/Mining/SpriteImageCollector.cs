using System;
using System.Collections.Generic;
using GamePlanner.Core.Imaging;
using GamePlanner.Core.Text;
using UnityEngine;

namespace GamePlanner.Core.Mining
{
    /// <summary>
    /// Converte sprites em PNG para o dataset, uma vez por sprite: vários prefabs costumam dividir o mesmo
    /// ícone. Devolve a chave para pôr em ContentDoc.IconImage. Só na thread principal.
    /// </summary>
    public sealed class SpriteImageCollector
    {
        private readonly MinedDataset _dataset;
        private readonly MiningContext _context;
        private readonly Dictionary<int, string> _keysBySprite = new Dictionary<int, string>();

        /// <summary>Conversões feitas desde o último Reset. O minerador usa para decidir quando dar yield.</summary>
        public int ConvertedSinceYield { get; private set; }

        public SpriteImageCollector(MinedDataset dataset, MiningContext context)
        {
            _dataset = dataset;
            _context = context;
        }

        /// <summary>Chave da imagem, ou null sem sprite, com imagens desligadas ou se a conversão falhar.</summary>
        public string Collect(Sprite sprite)
        {
            if (sprite == null || !_context.IncludeImages) return null;
            int id = sprite.GetInstanceID();
            if (_keysBySprite.TryGetValue(id, out string existing)) return existing;

            string key = null;
            try
            {
                byte[] png = SpriteConverter.ToPng(sprite, _context.MaxImageSize);
                key = "sprite/" + (ExtId.Sanitize(sprite.name) ?? "sem_nome") + "_" + id;
                _dataset.Images[key] = png;
                ConvertedSinceYield++;
            }
            catch (Exception e)
            {
                _dataset.Warn("Imagem '" + sprite.name + "' não convertida: " + e.Message);
            }
            _keysBySprite[id] = key;
            return key;
        }

        public void ResetYieldCounter() => ConvertedSinceYield = 0;
    }
}
