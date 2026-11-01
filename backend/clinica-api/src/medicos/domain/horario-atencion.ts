import { DatoInvalidoError } from '../../shared/domain/errors';
import { FechaCalendario } from '../../shared/domain/fecha-calendario';
import { HoraDelDia } from '../../shared/domain/hora-del-dia';

export interface DatosHorario {
  /** Días ISO: 1 = lunes ... 7 = domingo. */
  diasAtencion: number[];
  horaInicio: HoraDelDia;
  horaFin: HoraDelDia;
  intervaloMinutos: number;
}

/**
 * VALUE OBJECT: el horario de atención de un profesional (RF3).
 *
 * Concentra en un solo lugar la regla "¿qué franjas tiene este médico?".
 * En la versión anterior ese cálculo estaba dentro de CitasService, mezclado
 * con consultas a la base de datos (violación de SRP).
 */
export class HorarioAtencion {
  static readonly INTERVALO_MINIMO = 5;
  static readonly INTERVALO_MAXIMO = 240;

  private constructor(private readonly datos: DatosHorario) {}

  static crear(datos: DatosHorario): HorarioAtencion {
    const dias = [...new Set(datos.diasAtencion)].sort((a, b) => a - b);

    if (dias.length === 0) {
      throw new DatoInvalidoError('Debe seleccionar al menos un día de atención');
    }
    if (dias.some((d) => !Number.isInteger(d) || d < 1 || d > 7)) {
      throw new DatoInvalidoError('Los días de atención deben estar entre 1 (lunes) y 7 (domingo)');
    }
    if (!datos.horaInicio.esAnteriorA(datos.horaFin)) {
      throw new DatoInvalidoError('La hora de inicio debe ser anterior a la hora de fin');
    }
    const { intervaloMinutos: i } = datos;
    if (!Number.isInteger(i) || i < HorarioAtencion.INTERVALO_MINIMO || i > HorarioAtencion.INTERVALO_MAXIMO) {
      throw new DatoInvalidoError(
        `El intervalo debe estar entre ${HorarioAtencion.INTERVALO_MINIMO} y ${HorarioAtencion.INTERVALO_MAXIMO} minutos`,
      );
    }
    const duracion = datos.horaFin.minutosDesdeMedianoche - datos.horaInicio.minutosDesdeMedianoche;
    if (i > duracion) {
      throw new DatoInvalidoError('El intervalo no cabe en la franja horaria configurada');
    }
    return new HorarioAtencion({ ...datos, diasAtencion: dias });
  }

  atiendeEl(fecha: FechaCalendario): boolean {
    return this.datos.diasAtencion.includes(fecha.diaSemana);
  }

  /**
   * Todas las franjas posibles de un día: desde horaInicio, cada `intervalo`
   * minutos, mientras la cita completa termine a más tardar en horaFin.
   * Ej.: 07:00–08:00 cada 20 min → 07:00, 07:20, 07:40.
   */
  franjas(): HoraDelDia[] {
    const resultado: HoraDelDia[] = [];
    const fin = this.datos.horaFin.minutosDesdeMedianoche;
    for (
      let m = this.datos.horaInicio.minutosDesdeMedianoche;
      m + this.datos.intervaloMinutos <= fin;
      m += this.datos.intervaloMinutos
    ) {
      resultado.push(HoraDelDia.desdeMinutos(m));
    }
    return resultado;
  }

  /** ¿`hora` es exactamente el inicio de una franja válida? */
  incluyeFranja(hora: HoraDelDia): boolean {
    return this.franjas().some((f) => f.equals(hora));
  }

  get diasAtencion(): number[] { return [...this.datos.diasAtencion]; }
  get horaInicio(): HoraDelDia { return this.datos.horaInicio; }
  get horaFin(): HoraDelDia { return this.datos.horaFin; }
  get intervaloMinutos(): number { return this.datos.intervaloMinutos; }
}
