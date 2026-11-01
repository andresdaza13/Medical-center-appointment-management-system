import { ConflictoError, ReglaNegocioError } from '../../../shared/domain/errors';
import { CitaRepository } from '../cita.repository';
import { ReglaAgendamiento, SolicitudAgendamiento } from './regla-agendamiento';

const NOMBRES_DIA = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

/** RF-proyecto 3: solo se asignan citas a profesionales activos y con horario. */
export class MedicoDisponibleRegla extends ReglaAgendamiento {
  protected verificar({ medico }: SolicitudAgendamiento): void {
    if (!medico.activo) {
      throw new ReglaNegocioError(`${medico.nombres} no está activo y no puede recibir citas`);
    }
    medico.horarioObligatorio(); // lanza si no tiene horario configurado
  }
}

/** No se agenda en el pasado (ni a una hora de hoy que ya pasó). */
export class FechaNoPasadaRegla extends ReglaAgendamiento {
  protected verificar({ fecha, hora, ahora }: SolicitudAgendamiento): void {
    const esHoy = fecha.equals(ahora.hoy);
    if (fecha.esAnteriorA(ahora.hoy) || (esHoy && !ahora.horaActual.esAnteriorA(hora))) {
      throw new ReglaNegocioError('No se puede agendar una cita en una fecha u hora pasada');
    }
  }
}

/**
 * RF3: el agendamiento AUTÓNOMO solo se habilita dentro de la ventana
 * configurada (en semanas). El personal puede agendar más allá si lo necesita
 * (p. ej. un tratamiento que requiere control en dos meses).
 */
export class VentanaAgendamientoRegla extends ReglaAgendamiento {
  protected verificar({ fecha, ahora, configuracion, esAutonomo }: SolicitudAgendamiento): void {
    if (!esAutonomo) return;
    const limite = configuracion.ultimaFechaAgendable(ahora.hoy);
    if (fecha.esPosteriorA(limite)) {
      throw new ReglaNegocioError(
        `Solo se pueden agendar citas hasta el ${limite} (${configuracion.ventanaSemanas} semanas)`,
      );
    }
  }
}

/** RF3: el profesional atiende ese día de la semana. */
export class DiaAtencionRegla extends ReglaAgendamiento {
  protected verificar({ medico, fecha }: SolicitudAgendamiento): void {
    if (!medico.atiendeEl(fecha)) {
      throw new ReglaNegocioError(`${medico.nombres} no atiende los ${NOMBRES_DIA[fecha.diaSemana]}`);
    }
  }
}

/** RF3: la hora coincide con una franja del horario (respeta el intervalo). */
export class FranjaValidaRegla extends ReglaAgendamiento {
  protected verificar({ medico, hora }: SolicitudAgendamiento): void {
    const horario = medico.horarioObligatorio();
    if (!horario.incluyeFranja(hora)) {
      throw new ReglaNegocioError(
        `${hora} no es una franja válida: atiende de ${horario.horaInicio} a ${horario.horaFin} cada ${horario.intervaloMinutos} min`,
      );
    }
  }
}

/**
 * RNF 4: el turno no está tomado.
 *
 * OJO: esta verificación da un mensaje amable en el caso normal, pero NO
 * protege contra dos peticiones simultáneas (ambas podrían leer "libre").
 * La protección real es la restricción UNIQUE de la base de datos; el
 * repositorio convierte esa violación en ConflictoError.
 */
export class TurnoLibreRegla extends ReglaAgendamiento {
  constructor(private readonly citas: CitaRepository) {
    super();
  }

  protected async verificar({ medico, fecha, hora }: SolicitudAgendamiento): Promise<void> {
    const ocupados = await this.citas.turnosOcupados(medico.id!, fecha, fecha);
    if (ocupados.some((t) => t.hora.equals(hora))) {
      throw new ConflictoError(`El turno de las ${hora} del ${fecha} ya está ocupado`);
    }
  }
}

/** RF-proyecto 5: un paciente no tiene dos citas el mismo día con el mismo profesional. */
export class UnaCitaPorDiaRegla extends ReglaAgendamiento {
  constructor(private readonly citas: CitaRepository) {
    super();
  }

  protected async verificar({ medico, pacienteId, fecha }: SolicitudAgendamiento): Promise<void> {
    if (await this.citas.pacienteTieneCitaActiva(pacienteId, medico.id!, fecha)) {
      throw new ConflictoError(`El paciente ya tiene una cita con ${medico.nombres} el ${fecha}`);
    }
  }
}
