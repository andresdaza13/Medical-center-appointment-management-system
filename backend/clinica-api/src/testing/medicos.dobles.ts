import { HorarioAtencion } from '../medicos/domain/horario-atencion';
import { Especialidad, Medico, TipoProfesional } from '../medicos/domain/medico';
import { FiltroMedicos, MedicoRepository } from '../medicos/domain/medico.repository';
import { h } from './base';

export function unHorario(parcial: Partial<{ dias: number[]; inicio: string; fin: string; intervalo: number }> = {}) {
  return HorarioAtencion.crear({
    diasAtencion: parcial.dias ?? [1, 3, 5], // lunes, miércoles, viernes
    horaInicio: h(parcial.inicio ?? '07:00'),
    horaFin: h(parcial.fin ?? '08:00'),
    intervaloMinutos: parcial.intervalo ?? 20,
  });
}

export function unMedico(id = 1, opciones: { activo?: boolean; horario?: HorarioAtencion | null; especialidad?: Especialidad } = {}) {
  const horario = opciones.horario === null ? undefined : (opciones.horario ?? unHorario());
  return Medico.reconstituir(
    id,
    {
      nombres: `Médico ${id}`,
      tipo: TipoProfesional.MEDICO,
      especialidad: opciones.especialidad ?? Especialidad.TERAPIA_NEURAL,
    },
    opciones.activo ?? true,
    horario,
  );
}

export class MedicoRepositoryEnMemoria implements MedicoRepository {
  readonly datos: Medico[] = [];
  private siguienteId = 1;

  async buscarPorId(id: number) { return this.datos.find((m) => m.id === id) ?? null; }
  async listar(filtro: FiltroMedicos = {}) {
    return this.datos.filter(
      (m) => (!filtro.soloActivos || m.activo) && (!filtro.especialidad || m.especialidad === filtro.especialidad),
    );
  }
  async guardar(m: Medico) {
    if (m.id === undefined) {
      m.asignarId(this.siguienteId++);
      this.datos.push(m);
    }
    return m;
  }
}

