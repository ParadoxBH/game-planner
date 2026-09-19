using System;
using System.IO;
using System.Text;

namespace GamePlanner.Core.Api
{
    /// <summary>Corpo multipart/form-data com um arquivo, como o POST /media espera.</summary>
    public sealed class MultipartBody
    {
        public readonly string ContentType;
        public readonly byte[] Bytes;

        private MultipartBody(string contentType, byte[] bytes)
        {
            ContentType = contentType;
            Bytes = bytes;
        }

        public static MultipartBody SingleFile(string fieldName, string fileName, string mimeType, byte[] content)
        {
            string boundary = "GamePlanner" + Guid.NewGuid().ToString("N");
            string safeName = (fileName ?? "file").Replace("\"", "");
            using (var stream = new MemoryStream(content.Length + 512))
            {
                Write(stream, "--" + boundary + "\r\n" +
                              "Content-Disposition: form-data; name=\"" + fieldName + "\"; filename=\"" + safeName + "\"\r\n" +
                              "Content-Type: " + mimeType + "\r\n\r\n");
                stream.Write(content, 0, content.Length);
                Write(stream, "\r\n--" + boundary + "--\r\n");
                return new MultipartBody("multipart/form-data; boundary=" + boundary, stream.ToArray());
            }
        }

        private static void Write(Stream stream, string text)
        {
            byte[] bytes = Encoding.UTF8.GetBytes(text);
            stream.Write(bytes, 0, bytes.Length);
        }
    }
}
