using System.Collections.Generic;
using System.IO;
using System.Text;
using GamePlanner.Core.Json;
using GamePlanner.Core.Mining;
using GamePlanner.Core.Model;

namespace GamePlanner.Core.Upload
{
    /// <summary>
    /// Grava o dataset em disco: um JSON por recurso (o mesmo corpo do PUT em lote), as imagens em PNG e
    /// report.txt com os avisos. Serve para conferir antes de enviar. Não usa nada da Unity.
    /// </summary>
    public static class DatasetExporter
    {
        public static string Export(MinedDataset dataset, string directory)
        {
            string root = Path.Combine(directory, dataset.GameId);
            Directory.CreateDirectory(root);

            foreach (IReadOnlyList<ContentDoc> documents in dataset.Resources())
            {
                if (documents.Count == 0) continue;
                File.WriteAllText(Path.Combine(root, documents[0].Resource + ".json"), JsonWriter.Serialize(documents), Encoding.UTF8);
            }

            if (dataset.Rarities.Count > 0)
                File.WriteAllText(Path.Combine(root, "rarities.json"), RaritiesJson(dataset), Encoding.UTF8);

            string images = Path.Combine(root, "images");
            foreach (KeyValuePair<string, byte[]> image in dataset.Images)
            {
                string file = Path.Combine(images, image.Key.Replace('/', Path.DirectorySeparatorChar) + ".png");
                Directory.CreateDirectory(Path.GetDirectoryName(file));
                File.WriteAllBytes(file, image.Value);
            }

            var report = new StringBuilder();
            report.AppendLine("Jogo " + dataset.GameId + " (" + dataset.GameName + ")");
            foreach (IReadOnlyList<ContentDoc> documents in dataset.Resources())
                if (documents.Count > 0) report.AppendLine("  " + documents[0].Resource.PadRight(15) + documents.Count);
            if (dataset.Rarities.Count > 0) report.AppendLine("  rarities       " + dataset.Rarities.Count);
            report.AppendLine("  imagens        " + dataset.Images.Count);
            report.AppendLine();
            report.AppendLine("Avisos (" + dataset.Warnings.Count + ")");
            foreach (string warning in dataset.Warnings) report.AppendLine("  " + warning);
            File.WriteAllText(Path.Combine(root, "report.txt"), report.ToString(), Encoding.UTF8);

            return root;
        }

        /// <summary>As raridades vão uma por PUT, então o arquivo é um mapa código -> corpo do PUT.</summary>
        private static string RaritiesJson(MinedDataset dataset)
        {
            var writer = new JsonWriter();
            writer.BeginObject();
            foreach (RarityDoc rarity in dataset.Rarities) writer.Name(rarity.Code).Value(rarity);
            writer.EndObject();
            return writer.ToString();
        }
    }
}
