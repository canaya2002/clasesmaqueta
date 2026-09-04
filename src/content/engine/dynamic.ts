/**
 * SENDA — el contrato de una dinámica y su ERASURE.
 *
 * El problema real: `ComponentType<PlayerProps<TData>>` NO es asignable a `ComponentType<PlayerProps<unknown>>`
 * porque las props son contravariantes. El default de la industria es guardar el registro como
 * `Map<string, DynamicDefinition<any, any>>` y castear en el punto de uso. Eso compila y MIENTE: con `any`,
 * cambiar el schema de un plugin no rompe nada en tiempo de compilación y explota en la demo.
 *
 * La salida es erasure POR INSTANCIA, no por tipo: `bind(rawData)` parsea el data una vez con el schema del
 * plugin y devuelve un objeto de CLAUSURAS donde `TData` ya no aparece en ninguna firma. La validación en la
 * frontera es lo que hace SANA la erasure — y de paso da gratis el estado de error legible que el producto
 * necesita, porque un admin edita el contenido en vivo y la invalidez es un estado esperado, no un bug.
 */

import type { z } from 'zod';
import type { ContentText, I18nKey, Json, Result, Score01 } from './primitives';
import { err, ok } from './primitives';
import type { Issues, LocalIssue } from './issues';
import { asIssues, localIssue } from './issues';
import type { AnswerOf, DataOf, DetailOf, DynamicType } from './registry.types';

/* ------------------------------------------------------------------ resultados */

export interface GradeResult<TDetail extends Json = null> {
  readonly correct: boolean;
  /** Fraccionario en selección múltiple, emparejar, ordenar y clasificar; 0 o 1 en las binarias. */
  readonly score: Score01;
  readonly feedback: I18nKey | null;
  /**
   * Detalle TIPADO por la dinámica, en vez del `diff?: unknown` de la especificación.
   *
   * Ese `unknown` obliga a un cast en el único sitio donde se pinta — y ese sitio son tres: la analítica,
   * el resumen de lección y la bandeja de reportes. El plugin es dueño de su propio `FeedbackDetail`.
   */
  readonly detail: TDetail;
  /**
   * Atribución por skill. Sin esto no hay cola de repaso: un paso con cuatro skills premiaría o castigaría
   * a las cuatro por igual, y la pantalla de "Tus puntos débiles" no tendría cálculo.
   */
  readonly skillScores: Readonly<Record<string, Score01>>;
}

export interface DynamicSupports {
  readonly hearts: boolean;
  readonly timer: boolean;
  readonly audio: boolean;
  readonly keyboard: boolean;
}

/** Capacidades del equipo que una dinámica exige. `supports` es estático; esto se evalúa en runtime. */
export type Capability = 'mic' | 'speech' | 'pointer-fine';

/* --------------------------------------------------------------- el contrato */

export interface DynamicMeta<K extends DynamicType> {
  readonly type: K;
  readonly label: I18nKey;
  /**
   * Se incrementa a mano cuando cambia `dataSchema`.
   *
   * Sin esto, el `dynamicVersions` del snapshot de publicación no tiene fuente y la decisión de guardar
   * snapshots crudos en vez de migraciones se apoya en un campo que nadie puede llenar.
   */
  readonly version: number;

  readonly dataSchema: z.ZodType<DataOf<K>>;
  readonly answerSchema: z.ZodType<AnswerOf<K>>;
  readonly detailSchema: z.ZodType<DetailOf<K>>;
  readonly defaultData: DataOf<K>;

  /**
   * El esquema LAXO del borrador. Existe porque el editor no puede vivir dentro de `bind()`.
   *
   * Un paso a medio escribir es inválido POR CONSTRUCCIÓN bajo las reglas del motor: la primera tecla en el
   * enunciado produce `{ prompt: 'C', options: [], correctOptionId: null }`, y `options` no puede estar
   * vacío ni `correctOptionId` puede apuntar a una opción que aún no existe. Con solo el esquema estricto,
   * `bind` devuelve error en CADA PULSACIÓN y el editor se queda sin superficie de la que colgar.
   *
   * `bind` sigue siendo la puerta del player, la preview y la calificación. El editor usa `draftSchema` +
   * `validateDraft`, que pinta los errores sin bloquear la escritura.
   */
  readonly draftSchema: z.ZodType<unknown>;
  readonly validateDraft: (draft: unknown) => readonly LocalIssue[];

  /** Función PURA. Es la promesa central del motor: la calificación no depende de React ni del DOM. */
  readonly grade: (data: DataOf<K>, answer: AnswerOf<K>) => GradeResult<DetailOf<K>>;

  /**
   * La respuesta correcta a partir del data.
   *
   * Ninguna app educativa la pide, porque para JUGAR no hace falta. Aquí paga tres cosas: el arnés de
   * conformidad que toda dinámica pasa gratis, la validación de "este paso es resoluble" en el editor —un
   * paso que pasa Zod y es irresoluble llega al player y le quita corazones a 300 personas— y un seed que
   * puede generar respuestas realistas.
   */
  readonly solution: (data: DataOf<K>) => AnswerOf<K>;
  /** El estado inicial de la respuesta. El shell lo necesita para saber si habilitar Comprobar. */
  readonly emptyAnswer: (data: DataOf<K>) => AnswerOf<K>;

  /**
   * El SIGNIFICADO, no la forma.
   *
   * Prohibido meter reglas cruzadas en `dataSchema` con `.refine()`: la regla "correctOptionId debe existir
   * en options" en el schema produce un editor que no puede editar el error que te pide arreglar, porque el
   * parse falla antes de que puedas tocar el campo.
   */
  readonly validate: (data: DataOf<K>) => readonly LocalIssue[];

  /** Alimenta el ⌘K global sobre los ~2,100 ejercicios. */
  readonly searchText: (data: DataOf<K>) => readonly ContentText[];
  /** Una línea para la lista de pasos, el diff y las filas de analítica. Máximo 90 caracteres. */
  readonly describe: (data: DataOf<K>) => ContentText;
  /** Ids externos que el data referencia (media, skills). El import los remapea sin conocer la dinámica. */
  readonly refs: (data: DataOf<K>) => readonly string[];

  readonly estimateSeconds: (data: DataOf<K>) => number;
  /** Dimensiones de la respuesta que la analítica puede agregar sin conocer la dinámica. */
  readonly facets: (data: DataOf<K>, answer: Json) => Readonly<Record<string, number | string | boolean>>;
  /**
   * Política de castigo declarada POR DINÁMICA, no global.
   *
   * Descontar un corazón al fallar una flashcard envenena el repaso espaciado: el usuario deja de admitir
   * que no sabía, que es justo la señal que el SRS necesita.
   */
  readonly consumesHearts: boolean;
  readonly supports: DynamicSupports;
  readonly requires: readonly Capability[];
}

/* --------------------------------------------------------------- la erasure */

/** Un paso YA PARSEADO. Todo lo que el resto de la app puede hacer con una dinámica pasa por aquí. */
export interface BoundStep {
  readonly type: DynamicType;
  readonly data: Json;
  readonly grade: (answer: Json) => Result<GradeResult<Json>, Issues<LocalIssue>>;
  readonly solution: () => Json;
  readonly emptyAnswer: () => Json;
  readonly searchText: () => readonly ContentText[];
  readonly describe: () => ContentText;
  readonly refs: () => readonly string[];
  readonly estimateSeconds: () => number;
  readonly issues: () => readonly LocalIssue[];
  /**
   * Resumen de una respuesta en dimensiones que la analítica entiende SIN conocer la dinámica.
   *
   * Sin esto, la erasure no borra el `switch (step.type)`: lo REUBICA. Para responder "% de pasos de habla
   * omitidos por falta de micrófono", /studio/analytics tendría que reimportar el `answerSchema` del plugin,
   * y con eso vuelve el acoplamiento y se cae otra vez el code-splitting.
   */
  readonly facets: (answer: Json) => Readonly<Record<string, number | string | boolean>>;
}

/** La superficie erasada del plugin. El player, la preview, el editor y la analítica solo conocen esto. */
export interface ErasedDynamic {
  readonly type: DynamicType;
  readonly label: I18nKey;
  readonly version: number;
  readonly defaultData: Json;
  readonly consumesHearts: boolean;
  readonly supports: DynamicSupports;
  readonly requires: readonly Capability[];
  readonly bind: (rawData: Json) => Result<BoundStep, Issues<LocalIssue>>;
  /** La puerta del EDITOR: acepta un borrador inválido y reporta sin bloquear. */
  readonly validateDraft: (draft: unknown) => readonly LocalIssue[];
  readonly defaultDraft: () => Json;
}

/**
 * La misma superficie, conservando el tipo LITERAL de la dinámica.
 *
 * Sin esto, `defineDynamic` devolvería `type: DynamicType` (ensanchado) y el barrel perdería la información
 * que necesita la prueba de completitud: no podría saber CUÁLES dinámicas están registradas en runtime, solo
 * que son algunas.
 */
export interface ErasedDynamicOf<K extends DynamicType> extends ErasedDynamic {
  readonly type: K;
}

function issuesFromZod(error: z.ZodError): Issues<LocalIssue> {
  // `issue.path` es `PropertyKey[]` en Zod v4: los símbolos se filtran o el formateador de rutas los pinta
  // como "Symbol(...)" en un mensaje que un gerente de capacitación tiene que leer.
  const list = error.issues.map((i) =>
    localIssue('schema', i.message, { field: i.path.filter((p): p is string | number => typeof p !== 'symbol') }),
  );
  return asIssues(list) ?? [localIssue('schema', 'el ejercicio no valida contra su esquema')];
}

/**
 * Crea una dinámica y la erasa en el mismo acto.
 *
 * La erasure ocurre AQUÍ DENTRO, donde `TData` todavía es conocido, y por eso no hay un solo cast en todo
 * el archivo. Fuera de esta función, `DataOf<K>` no vuelve a aparecer.
 */
export function defineDynamic<K extends DynamicType>(meta: DynamicMeta<K>): ErasedDynamicOf<K> {
  return {
    type: meta.type,
    label: meta.label,
    version: meta.version,
    defaultData: meta.defaultData,
    consumesHearts: meta.consumesHearts,
    supports: meta.supports,
    requires: meta.requires,

    validateDraft: (draft: unknown) => meta.validateDraft(draft),
    defaultDraft: () => meta.defaultData,

    bind(rawData: Json): Result<BoundStep, Issues<LocalIssue>> {
      const parsed = meta.dataSchema.safeParse(rawData);
      if (!parsed.success) return err(issuesFromZod(parsed.error));
      const data = parsed.data;

      return ok({
        type: meta.type,
        data: rawData,

        facets: (answer: Json) => meta.facets(data, answer),

        grade(answer: Json): Result<GradeResult<Json>, Issues<LocalIssue>> {
          const a = meta.answerSchema.safeParse(answer);
          if (!a.success) return err(issuesFromZod(a.error));
          return ok(meta.grade(data, a.data));
        },

        solution: () => meta.solution(data),
        emptyAnswer: () => meta.emptyAnswer(data),
        searchText: () => meta.searchText(data),
        describe: () => meta.describe(data),
        refs: () => meta.refs(data),
        estimateSeconds: () => meta.estimateSeconds(data),
        issues: () => meta.validate(data),
      });
    },
  };
}
