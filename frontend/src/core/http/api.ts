import {
  AgendaDelDia,
  CitaCreada,
  CitaDetalle,
  Especialidad,
  Franja,
  HistorialPaciente,
  Horario,
  Medico,
  NuevoPaciente,
  Paciente,
  SugerenciaCita,
  SugerenciaPaciente,
  TipoProfesional,
} from '../types';
import { ApiClient } from './api-client';

/*
 * PATRÓN FACADE (GoF, estructural).
 *
 * Los componentes no saben de rutas, verbos HTTP ni query strings: llaman
 * funciones con nombres del negocio (`citasApi.agendaDelDia(...)`). Si una ruta
 * del backend cambia, solo se toca este archivo.
 */
const http = ApiClient.instancia;

export const medicosApi = {
  listar: (especialidad?: Especialidad) => http.get<Medico[]>('/medicos', { especialidad }),
  registrar: (datos: { nombres: string; tipo: TipoProfesional; especialidad: Especialidad }) =>
    http.post<Medico>('/medicos', datos),
  cambiarEstado: (id: number, activo: boolean) => http.patch<Medico>(`/medicos/${id}/estado`, { activo }),
  configurarHorario: (id: number, horario: Horario) => http.put<Medico>(`/medicos/${id}/horario`, horario),
};

export const configuracionApi = {
  obtener: () => http.get<{ ventanaSemanas: number }>('/configuracion'),
  actualizar: (ventanaSemanas: number) => http.put<{ ventanaSemanas: number }>('/configuracion', { ventanaSemanas }),
};

export const pacientesApi = {
  miPerfil: () => http.get<Paciente>('/pacientes/me'),
  registrarMiPerfil: (datos: NuevoPaciente) => http.post<Paciente>('/pacientes/me', datos),
  registrar: (datos: NuevoPaciente) => http.post<Paciente>('/pacientes', datos),
  autocompletar: (documento: string) => http.get<SugerenciaPaciente[]>('/pacientes/buscar', { documento }),
};

export const citasApi = {
  agendaDelDia: (medicoId: number, fecha: string) => http.get<AgendaDelDia>('/citas', { medicoId, fecha }),
  historial: (documento: string) => http.get<HistorialPaciente>('/citas/historial', { documento }),
  misCitas: () => http.get<CitaDetalle[]>('/citas/mias'),
  disponibilidad: (medicoId: number, fecha: string) => http.get<Franja[]>('/citas/disponibilidad', { medicoId, fecha }),
  sugerencias: (filtro: { medicoId?: number; especialidad?: Especialidad }, limite = 6) =>
    http.get<SugerenciaCita[]>('/citas/sugerencias', { ...filtro, limite }),
  agendar: (datos: { medicoId: number; fecha: string; hora: string; pacienteId?: number; observacion?: string }) =>
    http.post<CitaCreada>('/citas', datos),
  cancelar: (id: number) => http.patch<CitaCreada>(`/citas/${id}/cancelar`),
};

export const exportacionApi = {
  agenda: (medicoId: number, fecha: string, formato: 'csv' | 'txt') =>
    http.descargar('/exportaciones/agenda', { medicoId, fecha, formato }, `citas_${fecha}.${formato}`),
};
