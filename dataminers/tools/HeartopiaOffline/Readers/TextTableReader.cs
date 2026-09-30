using System;
using System.Collections.Generic;
using GamePlanner.HeartopiaOffline.Decoding;
using Microsoft.Data.Sqlite;

namespace GamePlanner.HeartopiaOffline.Readers
{
    public sealed class TextRow
    {
        public long Hash;
        /// <summary>Um texto por idioma, na ordem de <see cref="TextTable.Languages"/>; null quando não traduzido.</summary>
        public string[] Values;
    }

    public sealed class TextTable
    {
        public string Table;
        public string[] Languages;
        public readonly List<TextRow> Rows = new List<TextRow>();
        public int Cells;
        public int InvalidCells;

        public int Index(string language) => Array.IndexOf(Languages, language);

        public string Get(TextRow row, string language)
        {
            int i = Index(language);
            return i < 0 ? null : row.Values[i];
        }
    }

    /// <summary>
    /// designTable.db e dialogueTable.db: uma tabela (hash INTEGER, zhHans, zhHant, en, de, fr, ja, ko, es, pt, th,
    /// ru, id), um texto localizado por linha. É só localização: nomes, descrições, missões, cartas e diálogos.
    /// </summary>
    public static class TextTableReader
    {
        public static TextTable Read(string dbPath, RowCipher cipher)
        {
            using SqliteConnection connection = ReadOnlyDb.Open(dbPath);
            var table = new TextTable { Table = ReadOnlyDb.FirstTable(connection) };

            using SqliteCommand command = connection.CreateCommand();
            command.CommandText = $"SELECT * FROM \"{table.Table}\"";
            using SqliteDataReader reader = command.ExecuteReader();

            table.Languages = new string[reader.FieldCount - 1];
            for (int i = 1; i < reader.FieldCount; i++) table.Languages[i - 1] = reader.GetName(i);

            while (reader.Read())
            {
                long hash = reader.GetInt64(0);
                var values = new string[table.Languages.Length];
                for (int i = 1; i < reader.FieldCount; i++)
                {
                    if (reader.IsDBNull(i)) continue;
                    table.Cells++;
                    values[i - 1] = cipher.DecodeString(hash, (byte[])reader.GetValue(i));
                    if (values[i - 1] == null) table.InvalidCells++;
                }
                table.Rows.Add(new TextRow { Hash = hash, Values = values });
            }
            return table;
        }
    }
}
