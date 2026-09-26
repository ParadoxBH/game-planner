using System;
using System.Collections;
using System.Collections.Generic;

namespace GamePlanner.Core.Mining
{
    /// <summary>
    /// Corrotina com tratamento de erro. A Unity não deixa pôr try/catch em volta de yield, e uma exceção
    /// dentro de StartCoroutine só vai para o console e some. Aqui cada MoveNext roda num try, e
    /// IEnumerator devolvido no yield é executado por dentro, como a Unity faria.
    /// </summary>
    public static class SafeCoroutine
    {
        /// <summary>Use com StartCoroutine(SafeCoroutine.Run(...)). onError recebe a exceção e encerra a corrotina.</summary>
        public static IEnumerator Run(IEnumerator routine, Action<Exception> onError, Func<bool> cancelled = null)
        {
            var stack = new Stack<IEnumerator>();
            stack.Push(routine);
            while (stack.Count > 0)
            {
                if (cancelled != null && cancelled()) yield break;

                IEnumerator top = stack.Peek();
                bool moved;
                try
                {
                    moved = top.MoveNext();
                }
                catch (Exception e)
                {
                    onError?.Invoke(e);
                    yield break;
                }

                if (!moved)
                {
                    stack.Pop();
                    continue;
                }

                if (top.Current is IEnumerator nested)
                {
                    stack.Push(nested);
                    continue;
                }
                yield return top.Current;
            }
        }
    }
}
