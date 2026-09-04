'use client';

/**
 * Resolución de un atajo numérico contra el DOM.
 *
 * El contrato con las dinámicas es "declara `data-hotkey` en tu control": cero superficie de API, un solo
 * listener para catorce plugins. Pero el atributo cae unas veces sobre el propio `<button>` y otras sobre
 * un `<span>` que lo envuelve, porque el control lo pinta un componente compartido que no acepta props
 * arbitrarias.
 *
 * `span.click()` NO activa el botón que hay dentro: el evento se despacha sobre el span y burbujea hacia
 * ARRIBA. Sin este descenso al primer descendiente interactivo, el atajo se ve declarado, se ve buscado, y
 * no hace absolutamente nada — que es la forma más cara de romper el teclado, porque no falla en ninguna
 * parte visible.
 */
const INTERACTIVE = 'button, [role="button"], [role="radio"], [role="checkbox"], a[href], input, summary';

export function activateHotkey(root: ParentNode | null, key: string): boolean {
  if (root === null) return false;
  const declared = root.querySelector(`[data-hotkey="${key}"]`);
  if (!(declared instanceof HTMLElement)) return false;

  const target = declared.matches(INTERACTIVE)
    ? declared
    : declared.querySelector<HTMLElement>(INTERACTIVE);
  if (target === null) return false;

  target.click();
  return true;
}
