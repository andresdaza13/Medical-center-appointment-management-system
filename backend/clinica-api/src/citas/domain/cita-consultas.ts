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

/**
 * RF7: cuántas citas tuvo un médico en un mes. Es una fila de un reporte
 * agregado: la cuenta la hace la base de datos (GROUP BY), no la aplicación.
 */
export interface ConteoMensual {
  medicoId: number;
  medicoNombre: string;
  /** 1 = enero … 12 = diciembre */
  mes: number;
  cantidad: number;
}

/** PUERTO de LECTURA de citas (lado "consulta" de CQRS). */
export interface CitaConsultas {
  /** RF1: agenda de un médico en una fecha, ordenada por hora. */
  delMedicoEnFecha(medicoId: number, fecha: FechaCalendario): Promise<CitaDetalle[]>;

  /** RF5: historial completo de un paciente, de la más reciente a la más antigua. */
  delPaciente(pacienteId: number): Promise<CitaDetalle[]>;

  /** RF7: citas no canceladas de un año, agrupadas por médico y mes. Solo trae los
   *  meses con citas. */
  conteoPorMesYMedico(anio: number): Promise<ConteoMensual[]>;
}

export const CITA_CONSULTAS = Symbol('CITA_CONSULTAS');