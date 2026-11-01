import { DatoInvalidoError } from './errors';

/**
 * VALUE OBJECT: una hora del día en formato 24 h ("07:05").
 *
 * Internamente se guarda como minutos desde la medianoche. Así comparar,
 * sumar intervalos y recorrer franjas es aritmética de enteros, sin
 * `split(':')` repetidos por todo el código (como en la versión anterior).
 */
export class HoraDelDia {
  private static readonly FORMATO = /^([01]\d|2[0-3]):([0-5]\d)$/;

  private constructor(readonly minutosDesdeMedianoche: number) {}

  static desde(valor: string): HoraDelDia {
    const match = HoraDelDia.FORMATO.exec(valor);
    if (!match) {
      throw new DatoInvalidoError(`Hora "${valor}" inválida; use HH:mm en formato 24 h`);
    }
    return new HoraDelDia(Number(match[1]) * 60 + Number(match[2]));
  }

  static desdeMinutos(minutos: number): HoraDelDia {
    if (!Number.isInteger(minutos) || minutos < 0 || minutos >= 24 * 60) {
      throw new DatoInvalidoError(`${minutos} minutos no corresponde a una hora del día`);
    }
    return new HoraDelDia(minutos);
  }

  sumarMinutos(minutos: number): HoraDelDia {
    return HoraDelDia.desdeMinutos(this.minutosDesdeMedianoche + minutos);
  }

  esAnteriorA(otra: HoraDelDia): boolean {
    return this.minutosDesdeMedianoche < otra.minutosDesdeMedianoche;
  }

  equals(otra: HoraDelDia): boolean {
    return this.minutosDesdeMedianoche === otra.minutosDesdeMedianoche;
  }

  toString(): string {
    const h = Math.floor(this.minutosDesdeMedianoche / 60);
    const m = this.minutosDesdeMedianoche % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  toJSON(): string {
    return this.toString();
  }
}
