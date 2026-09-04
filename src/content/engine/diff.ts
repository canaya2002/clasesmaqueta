/**
 * SENDA — diff estructural de contenido.
 *
 * Dos decisiones que separan un diff para programadores de uno que el gerente de capacitación puede leer:
 *
 * 1. **Los hijos se emparejan por ID, no por índice**, y los movimientos se detectan con LIS. Un diff
 *    ingenuo reporta "todo cambió" cuando solo se movió un paso.
 * 2. **La ruta usa el vocabulario de dominio**, no `units[2].lessons[11].steps[3].data.options[2].text`.
 *    En cuanto el comprador ve esa segunda forma, la tesis del no-code se cae en esa línea.
 */

import { canonicalString, contentHash } from './canonicalize';
import { longestIncreasingSubsequence } from './lis';
import type { ContentPath, PathSegment } from './path';
import type { Json } from './primitives';
import { text } from './primitives';

export type DiffKind = 'added' | 'removed' | 'moved' | 'changed';

export interface DiffOp {
  readonly kind: DiffKind;
  readonly path: ContentPath;
  readonly label: string;
  readonly before: Json | null;
  readonly after: Json | null;
}

/** Cualquier nodo del árbol que tenga identidad y, opcionalmente, hijos. */
export interface DiffNode {
  readonly id: string;
  readonly kind: 'course' | 'section' | 'unit' | 'lesson' | 'step';
  readonly title: string;
  readonly payload: Json;
  readonly children: readonly DiffNode[];
}

function segment(node: DiffNode, index: number): PathSegment {
  return { kind: node.kind, id: node.id, index, title: text(node.title) };
}

function extend(path: readonly PathSegment[], seg: PathSegment): ContentPath {
  const all = [...path, seg];
  const first = all[0];
  if (first === undefined) throw new Error('Ruta vacía: imposible por construcción');
  return [first, ...all.slice(1)];
}

export function diffTree(before: DiffNode, after: DiffNode): readonly DiffOp[] {
  const ops: DiffOp[] = [];
  walk(before, after, [], 0, ops);
  return ops;
}

function walk(
  before: DiffNode,
  after: DiffNode,
  parentPath: readonly PathSegment[],
  index: number,
  ops: DiffOp[],
): void {
  const path = extend(parentPath, segment(after, index));

  // El payload del propio nodo, sin sus hijos: así un cambio de título no arrastra a los 40 pasos de abajo.
  if (contentHash(before.payload) !== contentHash(after.payload)) {
    ops.push({
      kind: 'changed',
      path,
      label: after.title,
      before: before.payload,
      after: after.payload,
    });
  }

  const beforeById = new Map(before.children.map((c, i) => [c.id, { node: c, index: i }]));
  const afterIds = new Set(after.children.map((c) => c.id));

  for (const [id, entry] of beforeById) {
    if (afterIds.has(id)) continue;
    ops.push({
      kind: 'removed',
      path: extend(path, segment(entry.node, entry.index)),
      label: entry.node.title,
      before: entry.node.payload,
      after: null,
    });
  }

  // Índices ANTIGUOS de los supervivientes, en su orden NUEVO. Los que no caen en la subsecuencia
  // creciente más larga son los que de verdad se movieron.
  const survivorOldIndices: number[] = [];
  const survivorPositions: number[] = [];
  after.children.forEach((child, i) => {
    const old = beforeById.get(child.id);
    if (old === undefined) return;
    survivorOldIndices.push(old.index);
    survivorPositions.push(i);
  });

  const stable = new Set(
    longestIncreasingSubsequence(survivorOldIndices).map((k) => survivorPositions[k] ?? -1),
  );

  after.children.forEach((child, i) => {
    const old = beforeById.get(child.id);
    if (old === undefined) {
      ops.push({
        kind: 'added',
        path: extend(path, segment(child, i)),
        label: child.title,
        before: null,
        after: child.payload,
      });
      return;
    }
    if (!stable.has(i)) {
      ops.push({
        kind: 'moved',
        path: extend(path, segment(child, i)),
        label: `${child.title} (posición ${String(old.index + 1)} → ${String(i + 1)})`,
        before: null,
        after: null,
      });
    }
    walk(old.node, child, path, i, ops);
  });
}

export interface DiffSummary {
  readonly added: number;
  readonly removed: number;
  readonly moved: number;
  readonly changed: number;
  readonly identical: boolean;
}

export function summarizeDiff(ops: readonly DiffOp[]): DiffSummary {
  let added = 0;
  let removed = 0;
  let moved = 0;
  let changed = 0;
  for (const op of ops) {
    if (op.kind === 'added') added += 1;
    else if (op.kind === 'removed') removed += 1;
    else if (op.kind === 'moved') moved += 1;
    else changed += 1;
  }
  return { added, removed, moved, changed, identical: ops.length === 0 };
}

export { canonicalString, contentHash };
