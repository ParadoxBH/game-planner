using System;
using System.Collections;
using System.Collections.Generic;
using System.Globalization;
using System.Text;
using GamePlanner.Core.Mining;
using UnityEngine;

namespace GamePlanner.Valheim.Mining
{
    /// <summary>
    /// Desenha os biomas do mundo a partir da geração: amostra WorldGenerator.GetBiome numa grade e
    /// transforma cada bioma num MULTIPOLYGON. É o que faz o mapa procedural deixar de ser vazio —
    /// as regras não têm posição, mas o bioma delas passa a ter área.
    ///
    /// O contorno segue as bordas das células, nunca marching squares: aqui todo segmento é paralelo
    /// a um eixo e cai na grade, então não há diagonal nem ambiguidade de sela, que é como se produz
    /// anel auto-intersectante — e a API rejeita esses com 400 (JTS IsValidOp).
    ///
    /// Só depende do jogo em GetBiome; o resto é geometria pura.
    /// </summary>
    internal sealed class BiomeGeometry
    {
        /// <summary>Metade do lado da área amostrada. O mundo jogável tem raio 10000.</summary>
        public const float Radius = 10500f;

        /// <summary>Lado da célula. Divide 2×Radius certinho, então toda coordenada sai inteira.</summary>
        public const int Step = 125;

        /// <summary>Anel com menos células que isto é respingo de borda e não vale um polígono.</summary>
        private const int MinRingCells = 2;

        /// <summary>
        /// Quanto se afasta, em metros, um vértice por onde passam dois anéis. Quando duas manchas
        /// se tocam só num canto, os dois contornos cairiam exatamente no mesmo ponto e o anel se
        /// auto-intersecta — que é o que a API recusa com 400. Separar por 1 m resolve: é 0,8% da
        /// célula de 125 m, e num bioma de verdade o desvio de área fica na casa de 0,02%.
        /// </summary>
        private const int Nudge = 1;

        private readonly int _size;
        private readonly Heightmap.Biome[] _cells;

        private BiomeGeometry(int size)
        {
            _size = size;
            _cells = new Heightmap.Biome[size * size];
        }

        /// <summary>
        /// Amostra a grade inteira, uma linha por vez, devolvendo o controle ao jogo pelo orçamento
        /// de frame do minerador. São 168×168 pontos com Step 125.
        /// </summary>
        public static IEnumerator Sample(MiningKit kit, Action<BiomeGeometry> done)
        {
            int size = Mathf.RoundToInt(2f * Radius / Step);
            var grid = new BiomeGeometry(size);
            for (int j = 0; j < size; j++)
            {
                float z = -Radius + (j + 0.5f) * Step;
                for (int i = 0; i < size; i++)
                {
                    float x = -Radius + (i + 0.5f) * Step;
                    grid._cells[j * size + i] = WorldGenerator.instance.GetBiome(x, z);
                }
                if (j % 8 == 0) kit.Context.Status("Traçando biomas... linha " + j + " de " + size);
                if (kit.ShouldYield()) yield return null;
            }
            done(grid);
        }

        /// <summary>WKT do bioma, ou null quando ele não aparece na grade.</summary>
        public string AreaOf(Heightmap.Biome biome, out int vertices)
        {
            vertices = 0;
            List<int[]> rings = WorldRings(Trace(biome));
            if (rings.Count == 0) return null;

            var outers = new List<int[]>();
            var holes = new List<int[]>();
            foreach (int[] ring in rings)
            {
                // Com o interior sempre à esquerda, área positiva é contorno e negativa é buraco.
                if (SignedArea(ring) > 0) outers.Add(ring);
                else holes.Add(ring);
            }
            if (outers.Count == 0) return null;

            // Buraco pertence ao menor contorno que o contém: com contornos aninhados, o de fora
            // também conteria, e aí o furo sairia no polígono errado.
            var assigned = new List<int[]>[outers.Count];
            for (int i = 0; i < outers.Count; i++) assigned[i] = new List<int[]>();
            foreach (int[] hole in holes)
            {
                int owner = -1;
                double best = double.MaxValue;
                for (int i = 0; i < outers.Count; i++)
                {
                    double area = Math.Abs(SignedArea(outers[i]));
                    if (area >= best || !Contains(outers[i], hole[0], hole[1])) continue;
                    best = area;
                    owner = i;
                }
                if (owner >= 0) assigned[owner].Add(hole);
            }

            var sb = new StringBuilder("MULTIPOLYGON (");
            for (int i = 0; i < outers.Count; i++)
            {
                if (i > 0) sb.Append(", ");
                sb.Append('(');
                WriteRing(sb, outers[i], ref vertices);
                foreach (int[] hole in assigned[i])
                {
                    sb.Append(", ");
                    WriteRing(sb, hole, ref vertices);
                }
                sb.Append(')');
            }
            sb.Append(')');
            return sb.ToString();
        }

        /// <summary>
        /// Os anéis em coordenadas de jogo, afastando de 1 m todo vértice por onde passa mais de um
        /// anel. O afastamento vai para dentro do anel — esquerda(entrada) + esquerda(saída) — então
        /// dois contornos que se encostavam num canto saem para lados opostos e param de se tocar.
        /// </summary>
        private static List<int[]> WorldRings(List<List<long>> rings)
        {
            var shared = new Dictionary<long, int>();
            foreach (List<long> ring in rings)
            {
                foreach (long point in ring)
                {
                    int count;
                    shared.TryGetValue(point, out count);
                    shared[point] = count + 1;
                }
            }

            var result = new List<int[]>(rings.Count);
            foreach (List<long> ring in rings)
            {
                int n = ring.Count;
                var points = new int[n * 2];
                for (int i = 0; i < n; i++)
                {
                    long current = ring[i];
                    int x = World(X(current));
                    int y = World(Y(current));
                    if (shared[current] > 1)
                    {
                        long previous = ring[(i - 1 + n) % n];
                        long next = ring[(i + 1) % n];
                        int inX = Sign(X(current) - X(previous)), inY = Sign(Y(current) - Y(previous));
                        int outX = Sign(X(next) - X(current)), outY = Sign(Y(next) - Y(current));
                        x += (-inY - outY) * Nudge;
                        y += (inX + outX) * Nudge;
                    }
                    points[i * 2] = x;
                    points[i * 2 + 1] = y;
                }
                result.Add(points);
            }
            return result;
        }

        private static int Sign(int value) => value > 0 ? 1 : value < 0 ? -1 : 0;

        /// <summary>
        /// Os anéis do bioma. Cada borda entre uma célula dele e uma de fora vira um segmento
        /// dirigido com o bioma à esquerda; costurar os segmentos dá os anéis, já orientados.
        /// </summary>
        private List<List<long>> Trace(Heightmap.Biome biome)
        {
            var starts = new List<long>();
            var ends = new List<long>();
            var byStart = new Dictionary<long, List<int>>();
            int cells = 0;

            for (int j = 0; j < _size; j++)
            {
                for (int i = 0; i < _size; i++)
                {
                    if (!Has(i, j, biome)) continue;
                    cells++;
                    // Anti-horário com o interior à esquerda, um lado de cada vez.
                    if (!Has(i, j - 1, biome)) Edge(starts, ends, byStart, i, j, i + 1, j);
                    if (!Has(i + 1, j, biome)) Edge(starts, ends, byStart, i + 1, j, i + 1, j + 1);
                    if (!Has(i, j + 1, biome)) Edge(starts, ends, byStart, i + 1, j + 1, i, j + 1);
                    if (!Has(i - 1, j, biome)) Edge(starts, ends, byStart, i, j + 1, i, j);
                }
            }

            var rings = new List<List<long>>();
            if (cells < MinRingCells) return rings;

            var used = new bool[starts.Count];
            for (int seed = 0; seed < starts.Count; seed++)
            {
                if (used[seed]) continue;
                var ring = new List<long>();
                long origin = starts[seed];
                int current = seed;
                while (true)
                {
                    used[current] = true;
                    ring.Add(starts[current]);
                    long end = ends[current];
                    if (end == origin) break;
                    int next = Next(starts, ends, byStart, used, current);
                    if (next < 0)
                    {
                        // Não fechou: melhor perder um anel do que mandar geometria inválida.
                        ring = null;
                        break;
                    }
                    current = next;
                }
                if (ring != null && ring.Count >= 4) rings.Add(Simplify(ring));
            }
            return rings;
        }

        /// <summary>
        /// A continuação do segmento, preferindo a curva mais à esquerda. É o que separa dois anéis
        /// que se tocam só num canto, em vez de fundi-los num anel que passa duas vezes pelo ponto.
        /// </summary>
        private static int Next(List<long> starts, List<long> ends, Dictionary<long, List<int>> byStart, bool[] used,
                                int current)
        {
            long end = ends[current];
            List<int> candidates;
            if (!byStart.TryGetValue(end, out candidates)) return -1;

            int dx = X(end) - X(starts[current]);
            int dy = Y(end) - Y(starts[current]);
            // Esquerda, reto e direita, nesta ordem; voltar por onde veio nunca.
            int[][] turns = { new[] { -dy, dx }, new[] { dx, dy }, new[] { dy, -dx } };
            foreach (int[] turn in turns)
            {
                foreach (int candidate in candidates)
                {
                    if (used[candidate]) continue;
                    if (X(ends[candidate]) - X(end) == turn[0] && Y(ends[candidate]) - Y(end) == turn[1]) return candidate;
                }
            }
            return -1;
        }

        private static void Edge(List<long> starts, List<long> ends, Dictionary<long, List<int>> byStart,
                                 int x1, int y1, int x2, int y2)
        {
            long start = Key(x1, y1);
            List<int> list;
            if (!byStart.TryGetValue(start, out list)) byStart[start] = list = new List<int>(2);
            list.Add(starts.Count);
            starts.Add(start);
            ends.Add(Key(x2, y2));
        }

        /// <summary>Tira os vértices no meio de um trecho reto: o traço dá um por célula, e são 4 a 6× mais.</summary>
        private static List<long> Simplify(List<long> ring)
        {
            var result = new List<long>(ring.Count);
            for (int i = 0; i < ring.Count; i++)
            {
                long previous = ring[(i - 1 + ring.Count) % ring.Count];
                long current = ring[i];
                long next = ring[(i + 1) % ring.Count];
                bool straight = (X(current) - X(previous)) * (Y(next) - Y(current))
                                == (Y(current) - Y(previous)) * (X(next) - X(current));
                if (!straight) result.Add(current);
            }
            return result.Count >= 3 ? result : ring;
        }

        /// <summary>Duas vezes a área com sinal (fórmula do laço). Positiva é anti-horário.</summary>
        private static double SignedArea(int[] ring)
        {
            int n = ring.Length / 2;
            double sum = 0;
            for (int i = 0; i < n; i++)
            {
                int j = (i + 1) % n;
                sum += (double)ring[i * 2] * ring[j * 2 + 1] - (double)ring[j * 2] * ring[i * 2 + 1];
            }
            return sum;
        }

        /// <summary>Lançamento de raio: o ponto está dentro do anel?</summary>
        private static bool Contains(int[] ring, int px, int py)
        {
            int n = ring.Length / 2;
            bool inside = false;
            for (int i = 0, j = n - 1; i < n; j = i++)
            {
                int xi = ring[i * 2], yi = ring[i * 2 + 1];
                int xj = ring[j * 2], yj = ring[j * 2 + 1];
                if (yi > py != yj > py && px < (double)(xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
            }
            return inside;
        }

        private static void WriteRing(StringBuilder sb, int[] ring, ref int vertices)
        {
            int n = ring.Length / 2;
            sb.Append('(');
            for (int i = 0; i <= n; i++)
            {
                if (i > 0) sb.Append(", ");
                int k = (i % n) * 2;
                // InvariantCulture sempre: num idioma com vírgula decimal o WKT sairia com o número
                // errado de coordenadas, e sem erro nenhum até a API recusar.
                sb.Append(ring[k].ToString(CultureInfo.InvariantCulture))
                    .Append(' ')
                    .Append(ring[k + 1].ToString(CultureInfo.InvariantCulture));
            }
            sb.Append(')');
            vertices += n + 1;
        }

        private bool Has(int i, int j, Heightmap.Biome biome) =>
            i >= 0 && j >= 0 && i < _size && j < _size && (_cells[j * _size + i] & biome) != 0;

        private static int World(int lattice) => Mathf.RoundToInt(-Radius) + lattice * Step;

        // Chave inteira empacotada: float como chave de dicionário erraria por arredondamento.
        private static long Key(int x, int y) => ((long)x << 20) | (uint)y;

        private static int X(long key) => (int)(key >> 20);

        private static int Y(long key) => (int)(key & 0xFFFFF);
    }
}
