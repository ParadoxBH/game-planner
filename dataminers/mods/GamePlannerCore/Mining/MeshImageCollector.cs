using System;
using System.Collections.Generic;
using GamePlanner.Core.Imaging;
using GamePlanner.Core.Text;
using UnityEngine;

namespace GamePlanner.Core.Mining
{
    /// <summary>
    /// Par do SpriteImageCollector para jogos em que o ícone é o modelo 3D: fotografa as malhas (MeshSnapshot)
    /// uma vez por chave e devolve a chave para pôr em ContentDoc.IconImage. A chave é de quem chama porque a
    /// mesma malha pode sair com skins diferentes. Só na thread principal.
    /// </summary>
    public sealed class MeshImageCollector
    {
        private readonly MinedDataset _dataset;
        private readonly MiningContext _context;
        private readonly Dictionary<string, string> _keys = new Dictionary<string, string>();

        /// <summary>Layer da foto. Troque por uma que o pipeline do jogo desenhe (ex.: a do inventário).</summary>
        public int Layer = MeshSnapshot.DefaultLayer;

        private const int GiveUpAfter = 3;
        private int _succeeded, _failed;
        private bool _disabled;

        public MeshImageCollector(MinedDataset dataset, MiningContext context)
        {
            _dataset = dataset;
            _context = context;
        }

        /// <summary>Chave da imagem, ou null sem malha, com imagens desligadas ou se a foto falhar.</summary>
        public string Collect(string name, IList<MeshPart> parts, Quaternion rotation, Action<Renderer> customize = null)
        {
            if (!_context.IncludeImages || string.IsNullOrEmpty(name) || parts == null || parts.Count == 0) return null;
            string key = "mesh/" + (ExtId.Sanitize(name) ?? "sem_nome");
            if (_keys.TryGetValue(key, out string existing)) return existing;
            if (_disabled) return null;

            string result = null;
            try
            {
                _dataset.Images[key] = MeshSnapshot.ToPng(parts, rotation, _context.MaxImageSize, customize, Layer);
                result = key;
                _succeeded++;
            }
            catch (Exception e)
            {
                _dataset.Warn("Imagem '" + name + "' não renderizada: " + e.Message);
                // Se nenhuma das primeiras sai, o problema é o pipeline, não o modelo: para de tentar.
                if (++_failed >= GiveUpAfter && _succeeded == 0)
                {
                    _disabled = true;
                    _dataset.Warn("Renderização de ícones desligada: as " + GiveUpAfter + " primeiras falharam. Itens vão sem imagem.");
                }
            }
            _keys[key] = result;
            return result;
        }

        /// <summary>Atalho para uma malha só, com um material.</summary>
        public string Collect(string name, Mesh mesh, Material material, Quaternion rotation, Action<Renderer> customize = null)
        {
            if (mesh == null) return null;
            return Collect(name, new[] { new MeshPart(mesh, material) }, rotation, customize);
        }
    }
}
