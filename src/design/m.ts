/**
 * La superficie CURADA de motion.
 *
 * `eslint.config.mjs` prohíbe importar `motion/react` fuera de `src/design/**`. No es purismo: es lo que
 * impide que un componente cualquiera escriba su propia duración y se salte el intercambio de catálogo que
 * hace funcionar `prefers-reduced-motion`. Lo que un componente necesita de verdad —el elemento animable,
 * los valores de movimiento y el arrastre— se re-exporta aquí, y las TRANSICIONES siguen llegando solo por
 * `useVariant` y `useSpringT`.
 */

export {
  AnimatePresence,
  LayoutGroup,
  animate,
  motion,
  useAnimationControls,
  useDragControls,
  useMotionValue,
  useSpring,
  useTransform,
} from 'motion/react';

export type { MotionStyle, MotionValue, Transition, Variants } from 'motion/react';
