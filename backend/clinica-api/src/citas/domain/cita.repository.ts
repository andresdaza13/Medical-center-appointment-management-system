import { FechaCalendario } from '../../shared/domain/fecha-calendario';
import { HoraDelDia } from '../../shared/domain/hora-del-dia';
import { Cita } from './cita';

export interface TurnoOcupado {
  fecha: FechaCalendario;
  hora: HoraDelDia;
}

/**
 * PUERTO de ESCRITURA de citas (lado "comando").
 *
 * Contiene solo lo que necesitan los casos de uso que MODIFICAN citas. Las
 * consultas para pantallas y reportes van por otro puerto (CitaConsultas).
 * Esta separación es una versión ligera de CQRS y aplica ISP de SOLID.
 */
export interface CitaRepository {
  buscarPorId(id: number): Promise<Cita | null>;

  /** Turnos con cita ACTIVA del médico entre dos fechas (inclusive). */
  turnosOcupados(medicoId: number, desde: FechaCalendario, hasta: FechaCalendario): Promise<TurnoOcupado[]>;

  /** ¿El paciente ya tiene una cita activa con ese médico ese día? */
  pacienteTieneCitaActiva(pacienteId: number, medicoId: number, fecha: FechaCalendario): Promise<boolean>;

  /**
   * Inserta o actualiza. Si la BD rechaza el INSERT por la restricción única
   * de turno (dos personas reservando a la vez), lanza ConflictoError.
   */
  guardar(cita: Cita): Promise<Cita>;
}

export const CITA_REPOSITORY = Symbol('CITA_REPOSITORY');
