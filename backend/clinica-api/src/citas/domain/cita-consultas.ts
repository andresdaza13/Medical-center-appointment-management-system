import { FechaCalendario } from '../../shared/domain/fecha-calendario';
import { EstadoCita } from './cita';

/**
 * MODELO DE LECTURA: una cita "aplanada" con los datos que necesitan las
 * pantallas y reportes (paciente y médico incluidos).
 *
 * No es una entidad: no tiene comportamiento ni invariantes. Existe porque
 * cargar tres agregados (Cita, Paciente, Médico) por cada fila de una tabla
 * sería lento y complicado. El lado de lectura consulta lo que necesita en una
 * sola query.
 */
export interface CitaDetalle {
  id: number;
  fecha: string;
  hora: string;
  estado: EstadoCita;
  observacion?: string;
  creadoPor: string;
  paciente: {
    id: number;
    documento: string;
    nombreCompleto: string;
    celular: string;
    fechaNacimiento?: string;
  };
  medico: {
    id: number;
    nombres: string;
    especialidad: string;
  };
}

/** PUERTO de LECTURA de citas (lado "consulta" de CQRS). */
export interface CitaConsultas {
  /** RF1: agenda de un médico en una fecha, ordenada por hora. */
  delMedicoEnFecha(medicoId: number, fecha: FechaCalendario): Promise<CitaDetalle[]>;

  /** RF5: historial completo de un paciente, de la más reciente a la más antigua. */
  delPaciente(pacienteId: number): Promise<CitaDetalle[]>;
}

export const CITA_CONSULTAS = Symbol('CITA_CONSULTAS');
