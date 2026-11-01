import { DatoInvalidoError } from './errors';

/**
 * VALUE OBJECT: una fecha de calendario sin hora ni zona horaria ("2026-11-03").
 *
 * ¿Por qué no usar `Date` directamente? Porque `Date` representa un INSTANTE
 * (con hora y zona). Una cita es "el martes 3", no "el martes 3 a las 00:00 UTC".
 * Mezclar ambas ideas produce el bug clásico de que la cita aparece un día antes.
 *
 * Características de un Value Object:
 *  - Inmutable (todo es readonly, las operaciones devuelven uno nuevo).
 *  - Se valida a sí mismo al construirse: si existe, es válido.
 *  - Dos objetos con el mismo valor son iguales (equals).
 */
export class FechaCalendario {
  private static readonly FORMATO = /^(\d{4})-(\d{2})-(\d{2})$/;

  private constructor(
    readonly anio: number,
    readonly mes: number,
    readonly dia: number,
  ) {}

  static desde(valor: string): FechaCalendario {
    const match = FechaCalendario.FORMATO.exec(valor);
    if (!match) {
      throw new DatoInvalidoError(`Fecha "${valor}" inválida; use AAAA-MM-DD`);
    }
    const [, a, m, d] = match.map(Number);
    const utc = new Date(Date.UTC(a, m - 1, d));
    // Rechaza fechas imposibles como 2026-02-31 (Date las "corrige" a marzo).
    if (utc.getUTCFullYear() !== a || utc.getUTCMonth() !== m - 1 || utc.getUTCDate() !== d) {
      throw new DatoInvalidoError(`La fecha "${valor}" no existe en el calendario`);
    }
    return new FechaCalendario(a, m, d);
  }

  /** Conversión desde la columna DATE de la BD (Prisma la entrega a medianoche UTC). */
  static desdeDateUtc(fecha: Date): FechaCalendario {
    return new FechaCalendario(fecha.getUTCFullYear(), fecha.getUTCMonth() + 1, fecha.getUTCDate());
  }

  toDateUtc(): Date {
    return new Date(Date.UTC(this.anio, this.mes - 1, this.dia));
  }

  /** Día ISO-8601: 1 = lunes ... 7 = domingo. */
  get diaSemana(): number {
    const d = this.toDateUtc().getUTCDay(); // 0 = domingo
    return d === 0 ? 7 : d;
  }

  sumarDias(dias: number): FechaCalendario {
    const d = this.toDateUtc();
    d.setUTCDate(d.getUTCDate() + dias);
    return FechaCalendario.desdeDateUtc(d);
  }

  /** Años completos transcurridos desde esta fecha hasta `fecha` (útil para la edad). */
  aniosCumplidosEn(fecha: FechaCalendario): number {
    const cumplioEsteAnio = fecha.mes > this.mes || (fecha.mes === this.mes && fecha.dia >= this.dia);
    return fecha.anio - this.anio - (cumplioEsteAnio ? 0 : 1);
  }

  esAnteriorA(otra: FechaCalendario): boolean {
    return this.toString() < otra.toString(); // el formato ISO ordena lexicográficamente
  }

  esPosteriorA(otra: FechaCalendario): boolean {
    return this.toString() > otra.toString();
  }

  equals(otra: FechaCalendario): boolean {
    return this.toString() === otra.toString();
  }

  toString(): string {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${this.anio}-${p(this.mes)}-${p(this.dia)}`;
  }

  toJSON(): string {
    return this.toString();
  }
}
