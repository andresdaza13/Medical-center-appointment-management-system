import { DatoInvalidoError } from '../../shared/domain/errors';
import { FechaCalendario } from '../../shared/domain/fecha-calendario';

/**
 * Parámetros globales del agendamiento autónomo (RF3).
 * Hoy solo la ventana de tiempo; aquí se agregarían festivos, anticipación
 * mínima, etc., sin tocar el resto del sistema.
 */
export class ConfiguracionAgendamiento {
  static readonly VENTANA_POR_DEFECTO = 4;
  static readonly VENTANA_MAXIMA = 26;

  private constructor(readonly ventanaSemanas: number) {}

  static crear(ventanaSemanas: number): ConfiguracionAgendamiento {
    if (
      !Number.isInteger(ventanaSemanas) ||
      ventanaSemanas < 1 ||
      ventanaSemanas > ConfiguracionAgendamiento.VENTANA_MAXIMA
    ) {
      throw new DatoInvalidoError(
        `La ventana de agendamiento debe estar entre 1 y ${ConfiguracionAgendamiento.VENTANA_MAXIMA} semanas`,
      );
    }
    return new ConfiguracionAgendamiento(ventanaSemanas);
  }

  static porDefecto(): ConfiguracionAgendamiento {
    return new ConfiguracionAgendamiento(ConfiguracionAgendamiento.VENTANA_POR_DEFECTO);
  }

  /** Último día en que se puede agendar, contando desde `hoy`. */
  ultimaFechaAgendable(hoy: FechaCalendario): FechaCalendario {
    return hoy.sumarDias(this.ventanaSemanas * 7);
  }
}
