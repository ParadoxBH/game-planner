using System.Collections.Generic;
using GamePlanner.HeartopiaOffline.Decoding;
using Microsoft.Data.Sqlite;

namespace GamePlanner.HeartopiaOffline.Readers
{
    /// <summary>Uma linha do ResIndex: caminho do asset no projeto da Unity -> bundle que o contém.</summary>
    public sealed class ResourceEntry
    {
        public long Key;
        public string Path;
        public string Bundle;
    }

    public sealed class ResIndexData
    {
        public readonly List<ResourceEntry> Entries = new List<ResourceEntry>();
        public int InvalidCells;
        public int PathsWithPrefix;
        public int BundlesEndingAb;
    }

    /// <summary>ResIndex.db: tabela ResIndex (Key INTEGER, Path BLOB, Bundle BLOB), células ofuscadas.</summary>
    public static class ResIndexReader
    {
        public static List<(long Key, byte[] Path, byte[] Bundle)> ReadRaw(string dbPath)
        {
            var rows = new List<(long, byte[], byte[])>();
            using SqliteConnection connection = ReadOnlyDb.Open(dbPath);
            using SqliteCommand command = connection.CreateCommand();
            command.CommandText = "SELECT Key, Path, Bundle FROM ResIndex";
            using SqliteDataReader reader = command.ExecuteReader();
            while (reader.Read())
            {
                rows.Add((reader.GetInt64(0),
                    reader.IsDBNull(1) ? null : (byte[])reader.GetValue(1),
                    reader.IsDBNull(2) ? null : (byte[])reader.GetValue(2)));
            }
            return rows;
        }

        public static ResIndexData Decode(List<(long Key, byte[] Path, byte[] Bundle)> raw, RowCipher cipher)
        {
            var data = new ResIndexData();
            foreach ((long key, byte[] pathCell, byte[] bundleCell) in raw)
            {
                string path = cipher.DecodeString(key, pathCell);
                string bundle = cipher.DecodeString(key, bundleCell);
                if (pathCell != null && path == null) data.InvalidCells++;
                if (bundleCell != null && bundle == null) data.InvalidCells++;
                if (path != null && path.StartsWith("Assets/")) data.PathsWithPrefix++;
                if (bundle != null && bundle.EndsWith(".ab")) data.BundlesEndingAb++;
                data.Entries.Add(new ResourceEntry { Key = key, Path = path, Bundle = bundle });
            }
            return data;
        }
    }
}
