/**
 * La tienda. Tres artículos y una regla que no es obvia.
 *
 * El PRECIO se deriva de la economía vigente —el Studio lo mueve y el escaparate cambia al instante— pero
 * lo PAGADO se congela en el evento. Son las dos mitades de la misma decisión: bajar el precio de un
 * congelador abarata los que se compren a partir de ahora, y no reembolsa los que ya se compraron. La
 * alternativa —derivar también el gasto— deja el saldo negativo a quien compró caro.
 */

import type { EconomyConfig } from '@/content/engine/economy';
import type { Basis, ShopItemId } from './types';

export interface ShopItem {
  readonly id: ShopItemId;
  readonly name: string;
  readonly body: string;
  readonly glyph: string;
  readonly price: number;
  /** Por qué no se puede comprar ahora mismo, o `null` si sí se puede. */
  readonly blocked: string | null;
}

export function shopItems(econ: EconomyConfig, basis: Basis, heartsFull: boolean, hasBoost: boolean): readonly ShopItem[] {
  const afford = (price: number): string | null =>
    basis.gems >= price ? null : `Te faltan ${String(price - basis.gems)} gemas`;

  return [
    {
      id: 'heart-refill',
      name: 'Recargar corazones',
      body: 'Vuelve a llenar la barra ahora mismo, sin esperar.',
      glyph: '♥',
      price: econ.priceHeartRefill,
      // Un artículo que no hace nada no se ofrece "por si acaso": se dice por qué no sirve ahora.
      blocked: heartsFull ? 'Ya tienes todos los corazones' : afford(econ.priceHeartRefill),
    },
    {
      id: 'streak-freeze',
      name: 'Congelador de racha',
      body: 'Tapa un día sin práctica. Se guarda hasta que haga falta.',
      glyph: '❄',
      price: econ.priceStreakFreeze,
      blocked:
        basis.freezesOwned >= 2
          ? 'Ya tienes dos guardados, el máximo'
          : afford(econ.priceStreakFreeze),
    },
    {
      id: 'unlimited-hearts',
      name: 'Corazones ilimitados',
      body: 'Sin límite de fallos durante 24 horas.',
      glyph: '∞',
      price: econ.priceUnlimitedHearts,
      blocked: hasBoost ? 'Ya está activo' : afford(econ.priceUnlimitedHearts),
    },
  ];
}
