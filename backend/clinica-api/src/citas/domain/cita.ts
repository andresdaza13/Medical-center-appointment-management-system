import { ReglaNegocioError } from '../../shared/domain/errors';
import { FechaCalendario } from '../../shared/domain/fecha-calendario';
import { HoraDelDia } from '../../shared/domain/hora-del-dia';

export enum EstadoCita {
  AGENDADA = 'AGENDADA',
  ATENDIDA = 'ATENDIDA',
  CANCELADA = 'CANCELADA',
}

export interface DatosCita {
  medicoId: number;
  pacienteId: number;
  fecha: FechaCalendario;
  hora: HoraDelDia;
  observacion?: string;
  /** username de quien registró la cita (trazabilidad, RNF 2). */
  creadoPor: string;
}

/** RF6: el paciente cancela con mínimo 2 días de anticipación. */
export const ANTICIPACION_MINIMA_CANCELACION_DIAS = 2;
export const JUSTIFICACION_MIN = 10;
export const JUSTIFICACION_MAX = 500;

/** Datos que la entidad necesita para decidir si puede cancelarse. */
export interface SolicitudCancelacion {
  hoy: FechaCalendario;
  justificacion: string;
  /** true cuando cancela el propio paciente desde la web (aplica la anticipación). */
  esAutonoma: boolean;
}

/** Trazabilidad de una cancelación: por qué y cuándo. */
export interface Cancelacion {
  motivo: string;
  fecha: FechaCalendario;
}

/**
 * ENTIDAD Cita con su ciclo de vida:
 *
 *   AGENDADA ──cancelar()──▶ CANCELADA
 *       └────atender()────▶ ATENDIDA
 *
 * Las transiciones inválidas (cancelar una cita atendida, por ejemplo) las
 * impide la propia entidad, no el controlador ni la interfaz gráfica.
 *
 * Nota: la entidad solo guarda los ids de médico y paciente, no los objetos.
 * Así cada agregado se carga y se modifica por separado (regla de DDD:
 * referenciar otros agregados por identidad).
 */
export class Cita {
  private constructor(
    private _id: number | undefined,
    private readonly datos: DatosCita,
    private _estado: EstadoCita,
    private _cancelacion?: Cancelacion,
  ) {}

  static agendar(datos: DatosCita): Cita {
    const observacion = datos.observacion?.trim() || undefined;
    if (observacion && observacion.length > 500) {
      throw new ReglaNegocioError('La observación no puede superar 500 caracteres');
    }
    return new Cita(undefined, { ...datos, observacion }, EstadoCita.AGENDADA);
  }
    static reconstituir(id: number, datos: DatosCita, estado: EstadoCita, cancelacion?: Cancelacion): Cita {
    return new Cita(id, datos, estado, cancelacion);
  }

  cancelar({ hoy, justificacion, esAutonoma }: SolicitudCancelacion): void {
    if (this._estado !== EstadoCita.AGENDADA) {
      throw new ReglaNegocioError(`No se puede cancelar una cita en estado ${this._estado}`);
    }
    if (this.datos.fecha.esAnteriorA(hoy)) {
      throw new ReglaNegocioError('No se puede cancelar una cita de una fecha pasada');
    }
    // Solo el paciente queda limitado: el personal debe poder cancelar a última
    // hora (p. ej. el médico se enferma la víspera).
    if (esAutonoma && hoy.diasHasta(this.datos.fecha) < ANTICIPACION_MINIMA_CANCELACION_DIAS) {
      throw new ReglaNegocioError(
        `Solo puede cancelar con mínimo ${ANTICIPACION_MINIMA_CANCELACION_DIAS} días de anticipación`,
      );
    }
    const motivo = justificacion?.trim() ?? '';
    if (motivo.length < JUSTIFICACION_MIN || motivo.length > JUSTIFICACION_MAX) {
      throw new ReglaNegocioError(
        `La justificación debe tener entre ${JUSTIFICACION_MIN} y ${JUSTIFICACION_MAX} caracteres`,
      );
    }
    this._estado = EstadoCita.CANCELADA;
    this._cancelacion = { motivo, fecha: hoy };
  }

  atender(): void {
    if (this._estado !== EstadoCita.AGENDADA) {
      throw new ReglaNegocioError(`No se puede atender una cita en estado ${this._estado}`);
    }
    this._estado = EstadoCita.ATENDIDA;
  }

  /** Una cita activa ocupa su turno en la agenda del médico. */
  estaActiva(): boolean {
    return this._estado !== EstadoCita.CANCELADA;
  }

  asignarId(id: number): void {
    if (this._id !== undefined) throw new ReglaNegocioError('La cita ya tiene id');
    this._id = id;
  }

  get id(): number | undefined { return this._id; }
  get medicoId(): number { return this.datos.medicoId; }
  get pacienteId(): number { return this.datos.pacienteId; }
  get fecha(): FechaCalendario { return this.datos.fecha; }
  get hora(): HoraDelDia { return this.datos.hora; }
  get observacion(): string | undefined { return this.datos.observacion; }
  get creadoPor(): string { return this.datos.creadoPor; }
  get estado(): EstadoCita { return this._estado; }
  get motivoCancelacion(): string | undefined { return this._cancelacion?.motivo; }
  get fechaCancelacion(): FechaCalendario | undefined { return this._cancelacion?.fecha; }
}
