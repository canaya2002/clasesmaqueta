/**
 * Análisis del grafo de prerequisitos.
 *
 * Kahn da el orden topológico; el residuo con grado de entrada > 0 va a Tarjan para reportar los ciclos como
 * RUTAS CONCRETAS, no como un booleano. El default es no detectar ciclos, o detectarlos y lanzar en runtime;
 * lo primero deja al alumno con un camino sin progresión, lo segundo tumba la pantalla.
 */

export interface GraphAnalysis<T> {
  readonly order: readonly T[];
  /** Cada ciclo como la secuencia de nodos que lo forma, para poder nombrarlo en un mensaje. */
  readonly cycles: readonly (readonly T[])[];
  readonly unreachable: readonly T[];
}

export function analyzePrereqs<T extends string>(graph: ReadonlyMap<T, readonly T[]>): GraphAnalysis<T> {
  const nodes = [...graph.keys()];
  const indegree = new Map<T, number>();
  for (const n of nodes) indegree.set(n, 0);
  for (const [, deps] of graph) {
    for (const d of deps) {
      const current = indegree.get(d);
      if (current !== undefined) indegree.set(d, current);
    }
  }
  // El arco va del prerequisito al dependiente: `deps` son las unidades que deben completarse ANTES.
  for (const [node, deps] of graph) {
    indegree.set(node, deps.filter((d) => graph.has(d)).length);
  }

  const queue: T[] = nodes.filter((n) => (indegree.get(n) ?? 0) === 0);
  const order: T[] = [];
  const remaining = new Map(indegree);

  while (queue.length > 0) {
    const node = queue.shift();
    if (node === undefined) break;
    order.push(node);
    for (const [other, deps] of graph) {
      if (!deps.includes(node)) continue;
      const left = (remaining.get(other) ?? 0) - 1;
      remaining.set(other, left);
      if (left === 0) queue.push(other);
    }
  }

  const stuck = nodes.filter((n) => !order.includes(n));
  const cycles = stuck.length === 0 ? [] : tarjan(graph, stuck);

  // Inalcanzable: declara un prerequisito que no existe en el grafo.
  const unreachable = nodes.filter((n) => (graph.get(n) ?? []).some((d) => !graph.has(d)));

  return { order, cycles, unreachable };
}

function tarjan<T extends string>(graph: ReadonlyMap<T, readonly T[]>, scope: readonly T[]): readonly (readonly T[])[] {
  const index = new Map<T, number>();
  const low = new Map<T, number>();
  const onStack = new Set<T>();
  const stack: T[] = [];
  const out: T[][] = [];
  let counter = 0;

  const inScope = new Set(scope);

  // Iterativo a propósito: un grafo importado a mano puede ser profundo y una recursión desbordaría la pila
  // en la pantalla de publicación, que es donde menos conviene.
  function strongConnect(root: T): void {
    const work: { node: T; edge: number }[] = [{ node: root, edge: 0 }];
    index.set(root, counter);
    low.set(root, counter);
    counter += 1;
    stack.push(root);
    onStack.add(root);

    while (work.length > 0) {
      const frame = work[work.length - 1];
      if (frame === undefined) break;
      const deps = (graph.get(frame.node) ?? []).filter((d) => inScope.has(d));

      if (frame.edge < deps.length) {
        const next = deps[frame.edge];
        frame.edge += 1;
        if (next === undefined) continue;
        if (!index.has(next)) {
          index.set(next, counter);
          low.set(next, counter);
          counter += 1;
          stack.push(next);
          onStack.add(next);
          work.push({ node: next, edge: 0 });
        } else if (onStack.has(next)) {
          low.set(frame.node, Math.min(low.get(frame.node) ?? 0, index.get(next) ?? 0));
        }
        continue;
      }

      work.pop();
      const parent = work[work.length - 1];
      if (parent !== undefined) {
        low.set(parent.node, Math.min(low.get(parent.node) ?? 0, low.get(frame.node) ?? 0));
      }
      if ((low.get(frame.node) ?? 0) === (index.get(frame.node) ?? 0)) {
        const component: T[] = [];
        for (;;) {
          const w = stack.pop();
          if (w === undefined) break;
          onStack.delete(w);
          component.push(w);
          if (w === frame.node) break;
        }
        if (component.length > 1) out.push(component.reverse());
      }
    }
  }

  for (const node of scope) if (!index.has(node)) strongConnect(node);
  return out;
}
