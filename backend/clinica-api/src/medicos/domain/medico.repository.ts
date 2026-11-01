import { Especialidad, Medico } from './medico';

export interface FiltroMedicos {
  soloActivos?: boolean;
  especialidad?: Especialidad;
}

/** PUERTO de salida para persistir médicos con su horario. */
export interface MedicoRepository {
  buscarPorId(id: number): Promise<Medico | null>;
  listar(filtro?: FiltroMedicos): Promise<Medico[]>;
  /** Guarda el médico y su horario en una sola transacción. */
  guardar(medico: Medico): Promise<Medico>;
}

export const MEDICO_REPOSITORY = Symbol('MEDICO_REPOSITORY');
