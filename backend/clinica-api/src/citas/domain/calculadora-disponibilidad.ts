import { FechaCalendario } from '../../shared/domain/fecha-calendario';
import { HoraDelDia } from '../../shared/domain/hora-del-dia';
import { Medico } from '../../medicos/domain/medico';
import { TurnoOcupado } from './cita.repository';

export interface FranjaLibre {
  medicoId: number;
  fecha: FechaCalendario;
  hora: HoraDelDia;
}

export interface Momento {
  hoy: FechaCalendario;
  horaActual: HoraDelDia;
}

/**
 * SERVICIO DE DOMINIO: calcula las franjas libres de un médico.
 *
 * Es lógica pura: recibe datos y devuelve datos, sin base de datos ni reloj.
 * Por eso se prueba con entradas fijas y es fácil de razonar.
 *
 * Se usa un servicio de dominio (y no un método de Médico) porque la regla
 * combina información de dos agregados distintos: el horario del médico y
 * las citas ya registradas.
 */
export class CalculadoraDisponibilidad {
  /**
   * Franjas libres del médico entre `desde` y `hasta` (inclusive), en orden
   * cronológico, descartando las que ya pasaron. Se detiene al llegar a
   * `limite` resultados.
   */
  static franjasLibres(
    medico: Medico,
    desde: FechaCalendario,
    hasta: FechaCalendario,
    ocupados: TurnoOcupado[],
    ahora: Momento,
    limite = Number.POSITIVE_INFINITY,
  ): FranjaLibre[] {
    if (!medico.estaDisponibleParaAgendar() || medico.id === undefined) return [];

    const ocupadosSet = new Set(ocupados.map((t) => `${t.fecha}|${t.hora}`));
    const resultado: FranjaLibre[] = [];

    for (let fecha = desde; !fecha.esPosteriorA(hasta); fecha = fecha.sumarDias(1)) {
      if (fecha.esAnteriorA(ahora.hoy)) continue;

      for (const hora of medico.franjasDelDia(fecha)) {
        const yaPaso = fecha.equals(ahora.hoy) && !ahora.horaActual.esAnteriorA(hora);
        if (yaPaso || ocupadosSet.has(`${fecha}|${hora}`)) continue;

        resultado.push({ medicoId: medico.id, fecha, hora });
        if (resultado.length >= limite) return resultado;
      }
    }
    return resultado;
  }
}
