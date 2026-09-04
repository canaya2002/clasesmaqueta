/**
 * SENDA — nombres de la plantilla.
 *
 * `faker` con nombres en inglés o "Usuario 001" no ejercitan la normalización, y el cliente VA a buscar su
 * propio apellido en la demo. Aquí las frecuencias son las reales del padrón mexicano, hay nombres
 * compuestos, y un 8% lleva un solo apellido porque en las oficinas de Estados Unidos el segundo se pierde.
 */

/** Apellidos con su peso acumulado aproximado en el padrón mexicano. */
export const SURNAMES: readonly (readonly [string, number])[] = [
  ['Hernández', 3.6], ['García', 3.4], ['Martínez', 2.7], ['González', 2.6], ['López', 2.4],
  ['Rodríguez', 2.1], ['Pérez', 2.0], ['Sánchez', 1.7], ['Ramírez', 1.6], ['Cruz', 1.4],
  ['Flores', 1.3], ['Gómez', 1.2], ['Morales', 1.1], ['Vázquez', 1.1], ['Reyes', 1.0],
  ['Jiménez', 1.0], ['Torres', 0.9], ['Díaz', 0.9], ['Gutiérrez', 0.9], ['Ruiz', 0.8],
  ['Mendoza', 0.8], ['Aguilar', 0.8], ['Ortiz', 0.7], ['Moreno', 0.7], ['Castillo', 0.7],
  ['Romero', 0.6], ['Álvarez', 0.6], ['Rivera', 0.6], ['Chávez', 0.6], ['Ramos', 0.6],
  ['Muñoz', 0.6], ['Domínguez', 0.5], ['Herrera', 0.5], ['Medina', 0.5], ['Castro', 0.5],
  ['Vargas', 0.5], ['Guzmán', 0.5], ['Juárez', 0.5], ['Rojas', 0.4], ['Núñez', 0.4],
  ['Salazar', 0.4], ['Espinoza', 0.4], ['Contreras', 0.4], ['Delgado', 0.4], ['Cervantes', 0.4],
  ['Solís', 0.4], ['Peña', 0.4], ['Ibarra', 0.3], ['Padilla', 0.3], ['Zamora', 0.3],
  ['Rangel', 0.3], ['Valdez', 0.3], ['Orozco', 0.3], ['Camacho', 0.3], ['Fuentes', 0.3],
  ['Ávila', 0.3], ['Barrera', 0.3], ['Estrada', 0.3], ['Lara', 0.3], ['Márquez', 0.3],
  ['Navarro', 0.3], ['Ochoa', 0.3], ['Quintero', 0.2], ['Trejo', 0.2], ['Villalobos', 0.2],
  ['Bravo', 0.2], ['Cabrera', 0.2], ['Duarte', 0.2], ['Escobar', 0.2], ['Galván', 0.2],
  ['Huerta', 0.2], ['Islas', 0.2], ['Lozano', 0.2], ['Maldonado', 0.2], ['Nájera', 0.2],
  ['Olvera', 0.2], ['Pacheco', 0.2], ['Quiroz', 0.2], ['Rincón', 0.2], ['Tapia', 0.2],
];

export const FEMALE_NAMES: readonly string[] = [
  'María', 'Guadalupe', 'Ana', 'Alejandra', 'Fernanda', 'Daniela', 'Gabriela', 'Andrea',
  'Mariana', 'Paola', 'Karla', 'Lucía', 'Sofía', 'Valeria', 'Adriana', 'Claudia',
  'Verónica', 'Patricia', 'Rocío', 'Diana', 'Brenda', 'Elizabeth', 'Cecilia', 'Norma',
  'Itzel', 'Ximena', 'Regina', 'Jimena', 'Perla', 'Yolanda',
];

export const MALE_NAMES: readonly string[] = [
  'José', 'Juan', 'Luis', 'Carlos', 'Miguel', 'Jorge', 'Ricardo', 'Fernando',
  'Alejandro', 'Eduardo', 'Roberto', 'Javier', 'Sergio', 'Raúl', 'Óscar', 'Héctor',
  'Arturo', 'Emilio', 'Diego', 'Rodrigo', 'Iván', 'Gerardo', 'Adrián', 'Mauricio',
  'Ulises', 'Efraín', 'Rubén', 'Ismael', 'Salvador', 'Tomás',
];

/** Segundo nombre de los compuestos. Es lo que hace que "María Fernanda" exista. */
export const SECOND_FEMALE: readonly string[] = ['Fernanda', 'Guadalupe', 'José', 'Elena', 'Isabel', 'Paula', 'Camila', 'Renata'];
export const SECOND_MALE: readonly string[] = ['Antonio', 'Manuel', 'Alberto', 'Enrique', 'Ángel', 'David', 'Ernesto', 'Ignacio'];

/** Índice acumulado para muestrear apellidos por frecuencia REAL, no uniformemente. */
export const SURNAME_CUMULATIVE: readonly number[] = (() => {
  const out: number[] = [];
  let acc = 0;
  for (const entry of SURNAMES) {
    acc += entry[1];
    out.push(acc);
  }
  return out;
})();

export const SURNAME_TOTAL = SURNAME_CUMULATIVE[SURNAME_CUMULATIVE.length - 1] ?? 1;
