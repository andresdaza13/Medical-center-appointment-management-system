/** Tipos que reflejan los contratos (DTO) de la API. */

export type Rol = 'administrador' | 'agendador' | 'medico' | 'paciente';
export type Especialidad = 'TERAPIA_NEURAL' | 'QUIROPRAXIA' | 'FISIOTERAPIA';
export type TipoProfesional = 'MEDICO' | 'TERAPISTA';
export type Genero = 'HOMBRE' | 'MUJER' | 'OTRO';
export type EstadoCita = 'AGENDADA' | 'ATENDIDA' | 'CANCELADA';

export const ESPECIALIDADES: Record<Especialidad, string> = {
  TERAPIA_NEURAL: 'Terapia neural',
  QUIROPRAXIA: 'Quiropraxia',
  FISIOTERAPIA: 'Fisioterapia',
};

export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export interface Horario {
  diasAtencion: number[];
  horaInicio: string;
  horaFin: string;
  intervaloMinutos: number;
}

export interface Medico {
  id: number;
  nombres: string;
  tipo: TipoProfesional;
  especialidad: Especialidad;
  activo: boolean;
  horario: Horario | null;
}

export interface Paciente {
  id: number;
  documento: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  celular: string;
  genero: Genero;
  fechaNacimiento?: string;
  edad?: number;
  email?: string;
}

export interface SugerenciaPaciente {
  id: number;
  documento: string;
  nombreCompleto: string;
}

export interface NuevoPaciente {
  documento: string;
  nombres: string;
  apellidos: string;
  celular: string;
  genero: Genero;
  fechaNacimiento?: string;
  email?: string;
}

export interface CitaDetalle {
  id: number;
  fecha: string;
  hora: string;
  estado: EstadoCita;
  observacion?: string;
  creadoPor: string;
  paciente: { id: number; documento: string; nombreCompleto: string; celular: string; edad?: number };
  medico: { id: number; nombres: string; especialidad: Especialidad };
}

export interface AgendaDelDia {
  medico: { id: number; nombres: string; especialidad: Especialidad };
  fecha: string;
  total: number;
  citas: CitaDetalle[];
}

export interface HistorialPaciente {
  paciente: { id: number; documento: string; nombreCompleto: string; celular: string };
  total: number;
  citas: CitaDetalle[];
}

export interface Franja {
  fecha: string;
  hora: string;
}

export interface SugerenciaCita extends Franja {
  medicoId: number;
  medicoNombres: string;
  especialidad: Especialidad;
}

export interface CitaCreada {
  id: number;
  medicoId: number;
  pacienteId: number;
  fecha: string;
  hora: string;
  estado: EstadoCita;
}
