/**
 * Subsecuencia creciente más larga.
 *
 * Se usa para DETECTAR MOVIMIENTOS en el diff de contenido. Sin ella, marcar como "movido" todo elemento
 * cuyo índice cambió hace que insertar un paso al inicio de una lección de 20 reporte **19 movimientos**.
 * Y "añadir paso" está en el guion de demo, así que la probabilidad de que ocurra delante del comprador
 * es 1.
 *
 * Los elementos que SÍ están en la subsecuencia creciente más larga son los que se quedaron quietos; los
 * demás son los que de verdad se movieron. En el ejemplo: 1 movimiento, no 19.
 *
 * El mismo `lis()` lo consume la dinámica de ordenar secuencia para su calificación parcial: mover un ítem
 * de sitio debe costar un error, no marcar cuatro posiciones mal.
 */

/** Devuelve los ÍNDICES de `values` que forman una subsecuencia creciente más larga. */
export function longestIncreasingSubsequence(values: readonly number[]): readonly number[] {
  if (values.length === 0) return [];

  const predecessor = new Int32Array(values.length).fill(-1);
  // `tails[k]` = índice del último elemento de la subsecuencia creciente de longitud k+1 más pequeña.
  const tails: number[] = [];

  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (value === undefined) continue;

    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      const candidate = values[tails[mid] ?? 0];
      if (candidate !== undefined && candidate < value) lo = mid + 1;
      else hi = mid;
    }

    if (lo > 0) predecessor[i] = tails[lo - 1] ?? -1;
    tails[lo] = i;
  }

  const out: number[] = [];
  let cursor = tails[tails.length - 1] ?? -1;
  while (cursor >= 0) {
    out.push(cursor);
    cursor = predecessor[cursor] ?? -1;
  }
  return out.reverse();
}

/** Longitud de la LIS. La usa la calificación de "ordenar secuencia". */
export function lisLength(values: readonly number[]): number {
  return longestIncreasingSubsequence(values).length;
}
