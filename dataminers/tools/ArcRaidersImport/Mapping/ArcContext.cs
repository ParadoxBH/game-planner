using System.Collections.Generic;
using GamePlanner.ArcRaiders.Source;
using GamePlanner.Core.Mining;

namespace GamePlanner.ArcRaiders.Mapping
{
    /// <summary>O que os mapeadores compartilham: a fonte, o dataset em montagem e os avisos agrupados.</summary>
    public sealed class ArcContext
    {
        public readonly ArcSource Source;
        public readonly MinedDataset Dataset;

        /// <summary>Avisos repetidos (o mesmo campo desconhecido em 40 itens) viram uma linha com a contagem.</summary>
        private readonly Dictionary<string, List<string>> _grouped = new Dictionary<string, List<string>>();

        public ArcContext(ArcSource source, MinedDataset dataset)
        {
            Source = source;
            Dataset = dataset;
        }

        public void Warn(string message) => Dataset.Warn(message);

        /// <summary>Junta pelo assunto; os exemplos saem no fim, em <see cref="FlushWarnings"/>.</summary>
        public void Warn(string subject, string example)
        {
            if (!_grouped.TryGetValue(subject, out List<string> examples)) _grouped[subject] = examples = new List<string>();
            if (!examples.Contains(example)) examples.Add(example);
        }

        public void FlushWarnings()
        {
            const int MaxExamples = 8;
            foreach (KeyValuePair<string, List<string>> entry in _grouped)
            {
                List<string> examples = entry.Value;
                string shown = string.Join(", ", examples.GetRange(0, System.Math.Min(MaxExamples, examples.Count)));
                Dataset.Warn(entry.Key + " (" + examples.Count + "): " + shown + (examples.Count > MaxExamples ? ", ..." : ""));
            }
            _grouped.Clear();
        }
    }
}
