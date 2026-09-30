using Microsoft.Data.Sqlite;

namespace GamePlanner.HeartopiaOffline.Readers
{
    public static class ReadOnlyDb
    {
        /// <summary>
        /// Abre a CÓPIA do .db só para leitura. Sem pool, para o arquivo ser liberado assim que a conexão fecha
        /// e a pasta de trabalho poder ser apagada no fim.
        /// </summary>
        public static SqliteConnection Open(string path)
        {
            var builder = new SqliteConnectionStringBuilder
            {
                DataSource = path,
                Mode = SqliteOpenMode.ReadOnly,
                Pooling = false,
            };
            var connection = new SqliteConnection(builder.ToString());
            connection.Open();
            return connection;
        }

        /// <summary>Nome da primeira (e única) tabela do arquivo: "ResIndex", "DesignTable", "Dialogue".</summary>
        public static string FirstTable(SqliteConnection connection)
        {
            using SqliteCommand command = connection.CreateCommand();
            command.CommandText = "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY rowid LIMIT 1";
            return command.ExecuteScalar() as string;
        }
    }
}
