using System;
using System.Buffers.Binary;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;

namespace GamePlanner.HeartopiaOffline.Readers
{
    /// <summary>Um AssetBundle visto só pelo nome do arquivo: "0005d44a6093_ui_item_normal_p_bird_bird141.ab".</summary>
    public sealed class BundleEntry
    {
        public string FullPath;
        public string FileName;
        /// <summary>Os 12 hexadecimais do começo do nome.</summary>
        public string Prefix;
        /// <summary>O nome sem o prefixo e sem ".ab": "ui_item_normal_p_bird_bird141".</summary>
        public string Name;
        public long Size;
        public string Origin;
    }

    public sealed class HeaderSample
    {
        public int Checked;
        public int Encrypted;
        public int Plain;
        public int Unreadable;
        public string EngineRevision;
    }

    /// <summary>
    /// Lista os AssetBundles pelo nome, sem abrir o conteúdo — ele é criptografado (UnityCN) e fica fora por
    /// decisão. A única leitura é o cabeçalho UnityFS de uma amostra, para o relatório dizer se continua assim.
    /// </summary>
    public static class BundleNames
    {
        private static readonly Regex Pattern = new Regex(@"^([0-9a-f]{12})_(.+)\.ab$", RegexOptions.Compiled);

        public static List<BundleEntry> List(string dir, string origin)
        {
            var result = new List<BundleEntry>();
            if (dir == null || !Directory.Exists(dir)) return result;
            foreach (FileInfo file in new DirectoryInfo(dir).EnumerateFiles("*.ab"))
            {
                Match m = Pattern.Match(file.Name);
                result.Add(new BundleEntry
                {
                    FullPath = file.FullName,
                    FileName = file.Name,
                    Prefix = m.Success ? m.Groups[1].Value : null,
                    Name = m.Success ? m.Groups[2].Value : Path.GetFileNameWithoutExtension(file.Name),
                    Size = file.Length,
                    Origin = origin,
                });
            }
            result.Sort((a, b) => string.CompareOrdinal(a.Name, b.Name));
            return result;
        }

        /// <summary>Lê só os primeiros bytes de <paramref name="sampleSize"/> bundles espalhados pela lista.</summary>
        public static HeaderSample CheckHeaders(IReadOnlyList<BundleEntry> entries, int sampleSize)
        {
            var sample = new HeaderSample();
            if (entries.Count == 0) return sample;
            int step = Math.Max(1, entries.Count / sampleSize);
            for (int i = 0; i < entries.Count && sample.Checked < sampleSize; i += step)
            {
                sample.Checked++;
                bool? encrypted = IsEncrypted(entries[i].FullPath, out string revision);
                if (revision != null) sample.EngineRevision = revision;
                if (encrypted == true) sample.Encrypted++;
                else if (encrypted == false) sample.Plain++;
                else sample.Unreadable++;
            }
            return sample;
        }

        /// <summary>
        /// Cabeçalho UnityFS: assinatura, versão (u32), "5.x.x", revisão do motor, tamanho (i64), dois u32 e as
        /// flags (u32), tudo big-endian. A flag de criptografia do UnityCN é 0x200 até a 2020.3.33 (depois a Unity
        /// reusou esse bit para alinhamento e o UnityCN passou para 0x1400) — mesma regra do UnityPy.
        /// </summary>
        private static bool? IsEncrypted(string path, out string revision)
        {
            revision = null;
            var header = new byte[256];
            int read;
            using (var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                read = stream.Read(header, 0, header.Length);

            if (read < 8 || Encoding.ASCII.GetString(header, 0, 8) != "UnityFS\0") return null;
            int pos = 12;
            if (!SkipString(header, read, ref pos)) return null;
            int revisionStart = pos;
            if (!SkipString(header, read, ref pos)) return null;
            revision = Encoding.ASCII.GetString(header, revisionStart, pos - revisionStart - 1);
            if (pos + 8 + 4 + 4 + 4 > read) return null;
            uint flags = BinaryPrimitives.ReadUInt32BigEndian(header.AsSpan(pos + 16));

            return (flags & (UsesOldFlags(revision) ? 0x200u : 0x1400u)) != 0;
        }

        private static bool SkipString(byte[] buffer, int length, ref int pos)
        {
            while (pos < length && buffer[pos] != 0) pos++;
            if (pos >= length) return false;
            pos++;
            return true;
        }

        private static bool UsesOldFlags(string revision)
        {
            Match m = Regex.Match(revision ?? "", @"^(\d+)\.(\d+)\.(\d+)");
            if (!m.Success) return true;
            var v = new Version(int.Parse(m.Groups[1].Value), int.Parse(m.Groups[2].Value), int.Parse(m.Groups[3].Value));
            return v.Major < 2020
                   || (v.Major == 2020 && v < new Version(2020, 3, 34))
                   || (v.Major == 2021 && v < new Version(2021, 3, 2))
                   || (v.Major == 2022 && v < new Version(2022, 1, 1));
        }
    }
}
