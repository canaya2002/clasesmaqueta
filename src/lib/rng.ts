/**
 * SENDA — aleatoriedad determinista.
 *
 * `Math.random` está prohibido por lint en todo `src/`. Aquí viven las tres primitivas que lo sustituyen, y
 * la separación entre ellas es una decisión de rendimiento medible:
 *
 * - `mix32` es un hash entero (~6 ns). Es lo que se usa en el fan-out de 149,640 celdas.
 * - `mulberry32` es un flujo corto por entidad.
 * - `splitmix32` es el flujo PURO que avanza como valor, para que un reducer pueda barajar sin dejar de ser
 *   una función pura.
 *
 * Lo que NO se hace: `seedrandom(\`user-\${id}-day-\${d}\`)()` dentro de un bucle. Construye un objeto ARC4
 * por llamada (~3–6 µs) y convierte un arranque de 1.6 ms en uno de 600 ms.
 */

/** Hash entero de tres argumentos. La primitiva del camino caliente. */
export function mix32(a: number, b: number, c: number): number {
  let h = (a ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (b + 0x85ebca6b), 0xcc9e2d51) >>> 0;
  h = ((h << 15) | (h >>> 17)) >>> 0;
  h = Math.imul(h ^ (c + 0xc2b2ae35), 0x1b873593) >>> 0;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

/** Un entero de 32 bits a [0, 1). */
export function u01(h: number): number {
  return (h >>> 0) / 4294967296;
}

/** FNV-1a de 32 bits sobre una cadena. */
export function fnv1a(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Hash de 64 bits REALES, como dos FNV-1a con semillas distintas.
 *
 * Con 32 bits y ~7,600 blobs, la probabilidad de colisión por cumpleaños es n²/2m = 0.67%: uno de cada 150
 * proyectos materializa la lección equivocada al hacer rollback, en silencio. Con 64 bits, 1.6e-12.
 */
export function hash64(input: string): string {
  let a = 0x811c9dc5;
  let b = 0x01000193;
  for (let i = 0; i < input.length; i += 1) {
    const c = input.charCodeAt(i);
    a ^= c;
    a = Math.imul(a, 0x01000193) >>> 0;
    b ^= c + i;
    b = Math.imul(b, 0x85ebca6b) >>> 0;
  }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}

/** Flujo corto por entidad. Devuelve una función; se usa fuera de reducers. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Flujo PURO: el estado entra y sale como valor.
 *
 * Es lo que permite que `sessionReducer` baraje opciones sin llamar a nada externo. Con un rng cerrado
 * sobre una clausura, React 18/19 invoca el reducer dos veces en desarrollo, la semilla avanza el doble y
 * la misma semilla deja de reproducir la misma sesión entre dev y producción — en silencio.
 */
export function splitmix32(state: number): readonly [value: number, next: number] {
  let z = (state + 0x9e3779b9) >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x21f0aaad) >>> 0;
  z = Math.imul(z ^ (z >>> 15), 0x735a2d97) >>> 0;
  z = (z ^ (z >>> 15)) >>> 0;
  return [z / 4294967296, (state + 0x9e3779b9) >>> 0];
}

/** Baraja una lista de forma pura: devuelve la lista y el siguiente estado del flujo. */
export function shuffle<T>(items: readonly T[], state: number): readonly [readonly T[], number] {
  const out = [...items];
  let s = state;
  for (let i = out.length - 1; i > 0; i -= 1) {
    const [r, next] = splitmix32(s);
    s = next;
    const j = Math.floor(r * (i + 1));
    const a = out[i];
    const b = out[j];
    if (a === undefined || b === undefined) continue;
    out[i] = b;
    out[j] = a;
  }
  return [out, s];
}
