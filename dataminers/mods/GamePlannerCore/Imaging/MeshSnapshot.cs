using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;
using UnityEngine;
using UnityEngine.Rendering;

namespace GamePlanner.Core.Imaging
{
    /// <summary>Uma malha a desenhar, com os materiais e a posição relativa à raiz do modelo.</summary>
    public sealed class MeshPart
    {
        public readonly Mesh Mesh;
        public readonly Material[] Materials;
        public readonly Matrix4x4 Transform;

        public MeshPart(Mesh mesh, Material[] materials, Matrix4x4 transform)
        {
            Mesh = mesh; Materials = materials; Transform = transform;
        }

        public MeshPart(Mesh mesh, Material material) : this(mesh, new[] { material }, Matrix4x4.identity) { }
    }

    /// <summary>
    /// Ícone de modelo 3D para jogo que não tem sprite dos itens (o inventário desenha a malha numa câmera).
    /// Monta as malhas longe da cena, numa camada própria, fotografa com projeção ortográfica enquadrada e fundo
    /// transparente e desmonta tudo antes de devolver: nada chega a aparecer no jogo. Só na thread principal.
    ///
    /// Cada pipeline desenha de um jeito, então há três caminhos, tentados em ordem até sair algo:
    /// 1. RenderPipeline.SubmitRenderRequest (URP/HDRP na Unity 2023.2+; Camera.Render não desenha nada lá);
    /// 2. Camera.Render (pipeline embutido e SRP antigos);
    /// 3. CommandBuffer.DrawMesh direto no RenderTexture, sem câmera nem culling. Ignora a luz da foto, mas o
    ///    pipeline deixa a do último frame nas variáveis globais dos shaders.
    /// Se os três saírem vazios, lança exceção: um ícone em branco é pior que nenhum.
    /// </summary>
    public static class MeshSnapshot
    {
        /// <summary>Camada quase nunca usada pelos jogos. As câmeras do jogo não chegam a ver: tudo some no mesmo frame.</summary>
        public const int DefaultLayer = 31;

        private static readonly Vector3 Stage = new Vector3(0, -20000, 0);
        private static readonly Color Clear = new Color(0, 0, 0, 0);

        /// <summary>
        /// PNG size x size do modelo. rotation é aplicada à raiz (a câmera olha para +Z); customize recebe cada
        /// renderer antes da foto (ex.: aplicar skin). Materiais instanciados por customize são destruídos no fim.
        /// Use uma layer que o renderer do pipeline desenhe (ex.: a do inventário do jogo): no URP, a layer
        /// também passa pelo filtro do Renderer Data, não só pelo cullingMask da câmera.
        /// </summary>
        public static byte[] ToPng(IList<MeshPart> parts, Quaternion rotation, int size, Action<Renderer> customize = null,
            int layer = DefaultLayer)
        {
            Texture2D texture = Render(parts, rotation, size, customize, layer);
            try
            {
                return texture.EncodeToPNG();
            }
            finally
            {
                UnityEngine.Object.Destroy(texture);
            }
        }

        /// <summary>Textura legível RGBA32. Quem chama destrói o resultado.</summary>
        public static Texture2D Render(IList<MeshPart> parts, Quaternion rotation, int size, Action<Renderer> customize = null,
            int layer = DefaultLayer)
        {
            if (parts == null || parts.Count == 0) throw new ArgumentException("Nenhuma malha para desenhar", nameof(parts));
            size = Mathf.Clamp(size, 16, 2048);
            layer = Mathf.Clamp(layer, 0, 31);

            var created = new List<UnityEngine.Object>();
            var renderers = new List<MeshRenderer>();
            RenderTexture previous = RenderTexture.active;
            RenderTexture target = null;
            try
            {
                Build(parts, rotation, layer, customize, created, renderers);

                Bounds bounds = renderers[0].bounds;
                for (int i = 1; i < renderers.Count; i++) bounds.Encapsulate(renderers[i].bounds);

                target = RenderTexture.GetTemporary(size, size, 24, RenderTextureFormat.ARGB32, RenderTextureReadWrite.sRGB);
                Camera camera = NewCamera(bounds, layer, created);
                Light light = NewLight(layer, created);

                light.enabled = true;
                try
                {
                    if (TrySubmitRenderRequest(camera, target))
                    {
                        Texture2D requested = Read(target);
                        if (!IsBlank(requested)) return KeyOutBackground(requested);
                        UnityEngine.Object.Destroy(requested);
                    }

                    ClearTarget(target);
                    camera.targetTexture = target;
                    camera.Render();
                    camera.targetTexture = null;
                    Texture2D rendered = Read(target);
                    if (!IsBlank(rendered)) return KeyOutBackground(rendered);
                    UnityEngine.Object.Destroy(rendered);
                }
                finally
                {
                    light.enabled = false;
                }

                DrawDirect(camera, renderers, target);
                Texture2D drawn = Read(target);
                if (!IsBlank(drawn)) return KeyOutBackground(drawn);
                UnityEngine.Object.Destroy(drawn);

                throw new InvalidOperationException("o pipeline de render não desenhou o modelo (imagem vazia)");
            }
            finally
            {
                RenderTexture.active = previous;
                if (target != null) RenderTexture.ReleaseTemporary(target);
                for (int i = created.Count - 1; i >= 0; i--)
                    if (created[i] != null) UnityEngine.Object.DestroyImmediate(created[i]);
            }
        }

        private static void Build(IList<MeshPart> parts, Quaternion rotation, int layer, Action<Renderer> customize,
            List<UnityEngine.Object> created, List<MeshRenderer> renderers)
        {
            var root = NewObject("GamePlanner snapshot", layer, created);
            root.transform.SetPositionAndRotation(Stage, rotation);

            foreach (MeshPart part in parts)
            {
                if (part?.Mesh == null) continue;
                var child = NewObject(part.Mesh.name, layer, created);
                child.transform.SetParent(root.transform, false);
                child.transform.localPosition = part.Transform.GetColumn(3);
                child.transform.localRotation = part.Transform.rotation;
                child.transform.localScale = part.Transform.lossyScale;
                child.AddComponent<MeshFilter>().sharedMesh = part.Mesh;
                var renderer = child.AddComponent<MeshRenderer>();
                renderer.sharedMaterials = part.Materials ?? new Material[0];
                renderer.shadowCastingMode = ShadowCastingMode.Off;
                renderer.receiveShadows = false;
                renderers.Add(renderer);
            }
            if (renderers.Count == 0) throw new ArgumentException("Nenhuma malha válida para desenhar", nameof(parts));

            if (customize == null) return;
            Material[][] original = renderers.Select(r => r.sharedMaterials).ToArray();
            foreach (MeshRenderer renderer in renderers) customize(renderer);
            for (int i = 0; i < renderers.Count; i++)
                foreach (Material material in renderers[i].sharedMaterials)
                    if (material != null && Array.IndexOf(original[i], material) < 0) created.Add(material);
        }

        // ------------------------------------------------------------------ caminhos de render

        private static bool _requestLookedUp;
        private static Type _standardRequest;
        private static MethodInfo _submit;
        private static MethodInfo _supports;

        /// <summary>
        /// RenderPipeline.SubmitRenderRequest(camera, new StandardRequest { destination = target }), por
        /// reflection: a API é da Unity 2023.2+, e o Core compila contra uma Unity mais antiga.
        /// </summary>
        private static bool TrySubmitRenderRequest(Camera camera, RenderTexture target)
        {
            if (GraphicsSettings.currentRenderPipeline == null) return false;
            if (!_requestLookedUp)
            {
                _requestLookedUp = true;
                _standardRequest = typeof(RenderPipeline).GetNestedType("StandardRequest", BindingFlags.Public);
                MethodInfo[] methods = typeof(RenderPipeline).GetMethods(BindingFlags.Public | BindingFlags.Static);
                _submit = methods.FirstOrDefault(m => m.Name == "SubmitRenderRequest" && m.IsGenericMethodDefinition && m.GetParameters().Length == 2);
                _supports = methods.FirstOrDefault(m => m.Name == "SupportsRenderRequest" && m.IsGenericMethodDefinition && m.GetParameters().Length == 2);
            }
            if (_standardRequest == null || _submit == null) return false;

            try
            {
                object request = Activator.CreateInstance(_standardRequest);
                FieldInfo destination = _standardRequest.GetField("destination");
                if (destination == null) return false;
                destination.SetValue(request, target);

                var arguments = new[] { (object)camera, request };
                if (_supports != null && !(bool)_supports.MakeGenericMethod(_standardRequest).Invoke(null, arguments)) return false;

                ClearTarget(target);
                camera.targetTexture = null;
                _submit.MakeGenericMethod(_standardRequest).Invoke(null, arguments);
                return true;
            }
            catch (Exception)
            {
                return false;
            }
        }

        /// <summary>Sem câmera: projeção da câmera da foto e DrawMesh de cada submalha no passe de forward.</summary>
        private static void DrawDirect(Camera camera, List<MeshRenderer> renderers, RenderTexture target)
        {
            using (var buffer = new CommandBuffer { name = "GamePlanner snapshot" })
            {
                buffer.SetRenderTarget(target);
                buffer.ClearRenderTarget(true, true, Clear);
                buffer.SetViewProjectionMatrices(camera.worldToCameraMatrix, camera.projectionMatrix);
                foreach (MeshRenderer renderer in renderers)
                {
                    Mesh mesh = renderer.GetComponent<MeshFilter>().sharedMesh;
                    Material[] materials = renderer.sharedMaterials;
                    if (mesh == null || materials.Length == 0) continue;
                    for (int sub = 0; sub < mesh.subMeshCount; sub++)
                    {
                        Material material = materials[Mathf.Min(sub, materials.Length - 1)];
                        if (material == null) continue;
                        buffer.DrawMesh(mesh, renderer.localToWorldMatrix, material, sub, ForwardPass(material));
                    }
                }
                Graphics.ExecuteCommandBuffer(buffer);
            }
        }

        /// <summary>Passe que desenha a cor: URP, depois pipeline embutido; sem nenhum, o primeiro.</summary>
        private static int ForwardPass(Material material)
        {
            foreach (string name in new[] { "UniversalForward", "UniversalForwardOnly", "ForwardBase", "Forward", "Unlit", "SRPDefaultUnlit" })
            {
                int pass = material.FindPass(name);
                if (pass >= 0) return pass;
            }
            return 0;
        }

        // ------------------------------------------------------------------ leitura

        private static void ClearTarget(RenderTexture target)
        {
            RenderTexture previous = RenderTexture.active;
            RenderTexture.active = target;
            GL.Clear(true, true, Clear);
            RenderTexture.active = previous;
        }

        private static Texture2D Read(RenderTexture target)
        {
            RenderTexture previous = RenderTexture.active;
            RenderTexture.active = target;
            var result = new Texture2D(target.width, target.height, TextureFormat.RGBA32, false);
            result.ReadPixels(new Rect(0, 0, target.width, target.height), 0, 0);
            result.Apply(false, false);
            RenderTexture.active = previous;
            return result;
        }

        /// <summary>Vazia = todos os pixels iguais (transparente ou só o fundo): nada foi desenhado.</summary>
        private static bool IsBlank(Texture2D texture)
        {
            Color32[] pixels = texture.GetPixels32();
            Color32 first = pixels[0];
            foreach (Color32 p in pixels)
                if (p.r != first.r || p.g != first.g || p.b != first.b || p.a != first.a) return false;
            return true;
        }

        /// <summary>
        /// Pipeline com alvo intermediário sem alfa (HDR) devolve fundo opaco. Se os quatro cantos são da mesma
        /// cor e opacos, essa cor é o fundo e vira transparente.
        /// </summary>
        private static Texture2D KeyOutBackground(Texture2D texture)
        {
            Color32[] pixels = texture.GetPixels32();
            int w = texture.width, h = texture.height;
            Color32 corner = pixels[0];
            if (corner.a < 255) return texture;
            foreach (int index in new[] { w - 1, (h - 1) * w, h * w - 1 })
            {
                Color32 c = pixels[index];
                if (c.r != corner.r || c.g != corner.g || c.b != corner.b || c.a != corner.a) return texture;
            }
            for (int i = 0; i < pixels.Length; i++)
            {
                Color32 p = pixels[i];
                if (Math.Abs(p.r - corner.r) <= 2 && Math.Abs(p.g - corner.g) <= 2 && Math.Abs(p.b - corner.b) <= 2)
                    pixels[i] = new Color32(0, 0, 0, 0);
            }
            texture.SetPixels32(pixels);
            texture.Apply(false, false);
            return texture;
        }

        // ------------------------------------------------------------------ montagem

        private static GameObject NewObject(string name, int layer, List<UnityEngine.Object> created)
        {
            var go = new GameObject(name) { layer = layer, hideFlags = HideFlags.HideAndDontSave };
            created.Add(go);
            return go;
        }

        /// <summary>Ortográfica, de frente (+Z), com margem de 8% e fundo transparente.</summary>
        private static Camera NewCamera(Bounds bounds, int layer, List<UnityEngine.Object> created)
        {
            var go = NewObject("GamePlanner snapshot camera", layer, created);
            float depth = bounds.extents.magnitude + 1f;
            go.transform.SetPositionAndRotation(bounds.center - Vector3.forward * depth, Quaternion.identity);

            var camera = go.AddComponent<Camera>();
            camera.enabled = false;
            camera.orthographic = true;
            camera.orthographicSize = Mathf.Max(bounds.extents.x, bounds.extents.y, 0.01f) * 1.08f;
            camera.aspect = 1f;
            camera.nearClipPlane = 0.01f;
            camera.farClipPlane = depth * 2f + 1f;
            camera.clearFlags = CameraClearFlags.SolidColor;
            camera.backgroundColor = Clear;
            camera.cullingMask = 1 << layer;
            camera.allowHDR = false;
            camera.allowMSAA = false;
            camera.useOcclusionCulling = false;
            return camera;
        }

        /// <summary>Luz de estúdio só para a camada da foto, desligada fora do Render.</summary>
        private static Light NewLight(int layer, List<UnityEngine.Object> created)
        {
            var go = NewObject("GamePlanner snapshot light", layer, created);
            go.transform.rotation = Quaternion.Euler(40f, -35f, 0f);
            var light = go.AddComponent<Light>();
            light.type = LightType.Directional;
            light.intensity = 1.1f;
            light.shadows = LightShadows.None;
            light.cullingMask = 1 << layer;
            light.enabled = false;
            return light;
        }
    }
}
