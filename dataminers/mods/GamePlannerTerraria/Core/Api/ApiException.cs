using System;
using System.Collections.Generic;
using GamePlanner.Core.Json;

namespace GamePlanner.Core.Api
{
    /// <summary>Resposta de erro da API (problem+json). Status 0 quando nem chegou ao servidor.</summary>
    public sealed class ApiException : Exception
    {
        public readonly int Status;
        public readonly Dictionary<string, object> Problem;

        public ApiException(int status, Dictionary<string, object> problem, string method, string path, string fallback)
            : base(method + " " + path + " -> " + (status == 0 ? "sem resposta" : status.ToString()) + ": " + Detail(problem, fallback))
        {
            Status = status;
            Problem = problem ?? new Dictionary<string, object>();
        }

        public string Detail() => Detail(Problem, Message);

        /// <summary>Posição do documento recusado num lote, quando o servidor informa.</summary>
        public int? RejectedIndex
        {
            get
            {
                int? index = Problem.GetInt("index");
                return index ?? Problem.GetObject("properties").GetInt("index");
            }
        }

        private static string Detail(Dictionary<string, object> problem, string fallback)
        {
            return problem.GetString("detail") ?? problem.GetString("title") ?? fallback ?? "";
        }
    }
}
