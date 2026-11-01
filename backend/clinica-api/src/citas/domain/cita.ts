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
  ) {}

  static agendar(datos: DatosCita): Cita {
    const observacion = datos.observacion?.trim() || undefined;
    if (observacion && observacion.length > 500) {
      throw new ReglaNegocioError('La observación no puede superar 500 caracteres');
    }
    return new Cita(undefined, { ...datos, observacion }, EstadoCita.AGENDADA);
  }

  static reconstituir(id: number, datos: DatosCita, estado: EstadoCita): Cita {
    return new Cita(id, datos, estado);
  }

  cancelar(hoy: FechaCalendario): void {
    if (this._estado !== EstadoCita.AGENDADA) {
      throw new ReglaNegocioError(`No se puede cancelar una cita en estado ${this._estado}`);
    }
    if (this.datos.fecha.esAnteriorA(hoy)) {
      throw new ReglaNegocioError('No se puede cancelar una cita de una fecha pasada');
    }
    this._estado = EstadoCita.CANCELADA;
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
}
