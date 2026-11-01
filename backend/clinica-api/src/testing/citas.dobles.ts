import { Cita, EstadoCita } from '../citas/domain/cita';
import { CitaConsultas, CitaDetalle } from '../citas/domain/cita-consultas';
import { CitaRepository, TurnoOcupado } from '../citas/domain/cita.repository';
import { ConflictoError } from '../shared/domain/errors';
import { FechaCalendario } from '../shared/domain/fecha-calendario';
import { f, h } from './base';

/**
 * Simula también la restricción UNIQUE de la BD: si se inserta una cita
 * activa en un turno ocupado lanza ConflictoError, como haría PostgreSQL.
 */
export class CitaRepositoryEnMemoria implements CitaRepository {
  readonly datos: Cita[] = [];
  private siguienteId = 1000;

  async buscarPorId(id: number) { return this.datos.find((c) => c.id === id) ?? null; }

  async turnosOcupados(medicoId: number, desde: FechaCalendario, hasta: FechaCalendario): Promise<TurnoOcupado[]> {
    return this.datos
      .filter((c) => c.medicoId === medicoId && c.estaActiva() && !c.fecha.esAnteriorA(desde) && !c.fecha.esPosteriorA(hasta))
      .map((c) => ({ fecha: c.fecha, hora: c.hora }));
  }

  async pacienteTieneCitaActiva(pacienteId: number, medicoId: number, fecha: FechaCalendario) {
    return this.datos.some(
      (c) => c.pacienteId === pacienteId && c.medicoId === medicoId && c.fecha.equals(fecha) && c.estaActiva(),
    );
  }

  async guardar(cita: Cita) {
    if (cita.id === undefined) {
      const choca = this.datos.some(
        (c) => c.estaActiva() && c.medicoId === cita.medicoId && c.fecha.equals(cita.fecha) && c.hora.equals(cita.hora),
      );
      if (choca) throw new ConflictoError('turno tomado (UNIQUE)');
      cita.asignarId(this.siguienteId++);
      this.datos.push(cita);
    }
    return cita;
  }

  /** Atajo para preparar escenarios. */
  sembrar(medicoId: number, pacienteId: number, fecha: string, hora: string, estado = EstadoCita.AGENDADA) {
    const cita = Cita.reconstituir(this.siguienteId++, { medicoId, pacienteId, fecha: f(fecha), hora: h(hora), creadoPor: 'seed' }, estado);
    this.datos.push(cita);
    return cita;
  }
}

export class CitaConsultasEnMemoria implements CitaConsultas {
  constructor(public resultado: CitaDetalle[] = []) {}
  async delMedicoEnFecha(medicoId: number, fecha: FechaCalendario) {
    return this.resultado.filter((c) => c.medico.id === medicoId && c.fecha === fecha.toString());
  }
  async delPaciente(pacienteId: number) {
    return this.resultado.filter((c) => c.paciente.id === pacienteId);
  }
}

export function unaCitaDetalle(parcial: Partial<CitaDetalle> & { id: number }): CitaDetalle {
  return {
    fecha: '2026-11-04',
    hora: '07:00',
    estado: EstadoCita.AGENDADA,
    creadoPor: 'agendador1',
    paciente: { id: 10, documento: '1061000001', nombreCompleto: 'Lucy Chávez', celular: '3001234567', fechaNacimiento: '1958-05-12' },
    medico: { id: 1, nombres: 'Médico 1', especialidad: 'TERAPIA_NEURAL' },
    ...parcial,
  };
}
