import { describe, expect, it } from 'vitest';
import { civilFromDays, dayKeyFromEpochDay, daysFromCivil, epochDayOf } from '../day';

describe('aritmética civil', () => {
  it('ida y vuelta sobre 40 años, día a día', () => {
    // El heatmap y la racha dependen de esto. Un desfase de un día en un año bisiesto mueve la racha
    // entera y no se nota hasta marzo.
    for (let z = -3653; z < 14_610; z += 1) {
      expect(daysFromCivil(civilFromDays(z))).toBe(z);
    }
  });

  it('la clave se reconstruye igual que la que produce el reloj', () => {
    expect(dayKeyFromEpochDay(0)).toBe('1970-01-01');
    expect(dayKeyFromEpochDay(epochDayOf('2026-03-10') ?? 0)).toBe('2026-03-10');
    expect(dayKeyFromEpochDay(epochDayOf('2024-02-29') ?? 0)).toBe('2024-02-29');
  });

  it('los siglos no bisiestos caen donde deben', () => {
    expect(dayKeyFromEpochDay((epochDayOf('1900-02-28') ?? 0) + 1)).toBe('1900-03-01');
    expect(dayKeyFromEpochDay((epochDayOf('2000-02-28') ?? 0) + 1)).toBe('2000-02-29');
  });
});
