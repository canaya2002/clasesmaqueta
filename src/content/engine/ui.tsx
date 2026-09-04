/**
 * SENDA — el contrato de INTERFAZ de una dinámica.
 *
 * Vive aparte de `dynamic.ts` porque `meta.ts` es puro y no puede importar su UI: si lo hiciera, el barrel
 * que registra las 14 dinámicas arrastraría 14 árboles de player —con audio, arrastre y canvas— al bundle
 * de una pantalla de analítica que no renderiza ni un ejercicio.
 *
 * La pieza no obvia es CÓMO se erasa un componente. `ComponentType<PlayerProps<TData>>` no es asignable a
 * `ComponentType<PlayerProps<Json>>` porque las props son contravariantes, y devolver un `ComponentType`
 * desde una clausura sería peor: cada `bind()` produciría una identidad de elemento nueva, React destruiría
 * el subárbol y el `<input>` de completar-el-espacio perdería el foco y el texto en cada tecla del autor.
 *
 * La salida: `defineDynamicUi` construye UNA VEZ, en tiempo de módulo, un componente envoltorio estable que
 * parsea en la frontera y renderiza el Player tipado. El tipo de elemento nunca cambia; solo las props.
 */

import { useMemo, useRef, type ComponentType, type ReactNode } from 'react';
import type { ErasedDynamicOf } from './dynamic';
import type { LocalIssue } from './issues';
import type { Json } from './primitives';
import type { AnswerOf, DataOf, DynamicType } from './registry.types';

export type StepUiPhase = 'answering' | 'checking' | 'correct' | 'wrong' | 'revealed';

/** Cómo llegó el usuario al control. Decide si se pintan los chips de teclas y si se enfoca al montar. */
export type InputModality = 'keyboard' | 'pointer';

export interface PlayerProps<TData, TAnswer> {
  readonly data: TData;
  readonly draft: TAnswer;
  readonly onDraft: (next: TAnswer) => void;
  /**
   * Atajo de envío: Enter, un swipe completado, un doble toque.
   *
   * El plugin NUNCA dibuja el botón Comprobar. Con un solo `onAnswer`, el shell no puede saber si el botón
   * va habilitado sin preguntarle al plugin, y el botón principal de la lección es el elemento más pesado
   * de la pantalla: tiene que ser del shell.
   */
  readonly onSubmit: () => void;
  /**
   * Anuncios TRANSITORIOS de interacción ("tomaste X, posición 2 de 5").
   *
   * No es para resultados: el panel de feedback ES la región aria-live polite, así que anunciar ahí el
   * veredicto lo diría dos veces. El anfitrión encola y da prioridad al feedback.
   */
  readonly announce: (text: string) => void;
  readonly phase: StepUiPhase;
  /** La solución, solo cuando la fase es `revealed`. En examen es siempre `null`. */
  readonly revealed: TAnswer | null;
  /** Aleatoriedad DETERMINISTA por intento. `Math.random` está prohibido por lint. */
  readonly rng: (salt: string) => number;
  readonly instanceId: string;
  readonly inputModality: InputModality;
  readonly disabled: boolean;
}

export interface EditorProps<TData> {
  readonly draft: unknown;
  readonly onDraft: (next: Json) => void;
  readonly issues: readonly LocalIssue[];
  readonly sample: TData;
}

export interface ErasedPlayerProps {
  readonly data: Json;
  readonly draft: Json;
  readonly onDraft: (next: Json) => void;
  readonly onSubmit: () => void;
  readonly announce: (text: string) => void;
  readonly phase: StepUiPhase;
  readonly revealed: Json | null;
  readonly rng: (salt: string) => number;
  readonly instanceId: string;
  readonly inputModality: InputModality;
  readonly disabled: boolean;
}

export interface ErasedEditorProps {
  readonly draft: unknown;
  readonly onDraft: (next: Json) => void;
  readonly issues: readonly LocalIssue[];
}

export interface ErasedDynamicUi {
  readonly type: string;
  readonly Player: ComponentType<ErasedPlayerProps>;
  readonly Editor: ComponentType<ErasedEditorProps>;
}

export interface DynamicUiParts<K extends DynamicType> {
  readonly Player: ComponentType<PlayerProps<DataOf<K>, AnswerOf<K>>>;
  readonly Editor: ComponentType<EditorProps<DataOf<K>>>;
  /** Qué pintar cuando el `data` no valida. Lo mismo sirve al player y al preview del Studio. */
  readonly renderDefect: (issues: readonly LocalIssue[]) => ReactNode;
}

/**
 * Construye la superficie erasada de una dinámica.
 *
 * Se ejecuta UNA VEZ al cargar el módulo. Los dos componentes que devuelve son constantes de módulo, así
 * que su identidad no cambia nunca y React no remonta.
 */
export function defineDynamicUi<K extends DynamicType>(
  dynamic: ErasedDynamicOf<K>,
  parts: DynamicUiParts<K>,
): ErasedDynamicUi {
  const spec = dynamic.spec;
  const TypedPlayer = parts.Player;
  const TypedEditor = parts.Editor;

  function PlayerBridge(props: ErasedPlayerProps): ReactNode {
    /**
     * Zod CLONA en cada parse. Sin memoizar por la referencia del `data`, cada pulsación de tecla produce
     * un `data` con identidad nueva: todo `useMemo([data.options])` se invalida, todo `React.memo` de las
     * filas falla y cualquier efecto que re-baraje o anuncie se dispara en cada tecla. El coste del parse
     * es de microsegundos; el de la identidad, un subárbol entero.
     */
    const parsedData = useMemo(() => spec.dataSchema.safeParse(props.data), [props.data]);

    /**
     * El último draft que sí parseó.
     *
     * El `answerSchema` describe el ESPACIO DEL BORRADOR, no la respuesta completa —la completitud vive en
     * `canSubmit`—, pero un draft rehidratado de `localStorage` con un esquema anterior sí puede fallar.
     * Caer a `emptyAnswer` en ese frame borraría los otros tres huecos que el alumno ya escribió.
     */
    const lastGood = useRef<AnswerOf<K> | null>(null);

    if (!parsedData.success) {
      return parts.renderDefect(
        parsedData.error.issues.map((i) => ({
          code: 'schema' as const,
          severity: 'error' as const,
          message: i.message,
          field: i.path.filter((p): p is string | number => typeof p !== 'symbol'),
          fixHint: null,
        })),
      );
    }
    const data = parsedData.data;

    const parsedDraft = spec.answerSchema.safeParse(props.draft);
    const draft = parsedDraft.success
      ? parsedDraft.data
      : (lastGood.current ?? spec.emptyAnswer(data));
    if (parsedDraft.success) lastGood.current = parsedDraft.data;

    const parsedReveal = props.revealed === null ? null : spec.answerSchema.safeParse(props.revealed);
    const revealed = parsedReveal !== null && parsedReveal.success ? parsedReveal.data : null;

    // `onDraft` acepta `Json`, que es MÁS ancho que `AnswerOf<K>`: por contravarianza de parámetros es
    // asignable donde se espera `(next: AnswerOf<K>) => void`, sin un solo cast.
    return (
      <TypedPlayer
        data={data}
        draft={draft}
        onDraft={props.onDraft}
        onSubmit={props.onSubmit}
        announce={props.announce}
        phase={props.phase}
        revealed={revealed}
        rng={props.rng}
        instanceId={props.instanceId}
        inputModality={props.inputModality}
        disabled={props.disabled}
      />
    );
  }

  function EditorBridge(props: ErasedEditorProps): ReactNode {
    return (
      <TypedEditor
        draft={props.draft}
        onDraft={props.onDraft}
        issues={props.issues}
        sample={spec.defaultData}
      />
    );
  }

  // Nombre explícito: sin él, DevTools y los límites de error muestran <Anonymous> y no se sabe qué plugin
  // reventó.
  PlayerBridge.displayName = `Player(${dynamic.type})`;
  EditorBridge.displayName = `Editor(${dynamic.type})`;

  return { type: dynamic.type, Player: PlayerBridge, Editor: EditorBridge };
}
