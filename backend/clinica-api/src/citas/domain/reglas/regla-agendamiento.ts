import { ConfiguracionAgendamiento } from '../../../configuracion/domain/configuracion-agendamiento';
import { Medico } from '../../../medicos/domain/medico';
import { FechaCalendario } from '../../../shared/domain/fecha-calendario';
import { HoraDelDia } from '../../../shared/domain/hora-del-dia';
import { Momento } from '../calculadora-disponibilidad';

/** Todo lo que una regla puede necesitar para decidir. */
export interface SolicitudAgendamiento {
  medico: Medico;
  pacienteId: number;
  fecha: FechaCalendario;
  hora: HoraDelDia;
  configuracion: ConfiguracionAgendamiento;
  ahora: Momento;
  /** true si la agenda el propio paciente por la web (RF2); false si es el personal. */
  esAutonomo: boolean;
}

/**
 * PATRÓN CHAIN OF RESPONSIBILITY (GoF, comportamiento).
 *
 * Problema: antes de agendar hay que verificar muchas reglas (médico activo,
 * día de atención, franja válida, turno libre, ventana de tiempo...). Ponerlas
 * todas en un método con diez `if` produce un método enorme que hay que abrir
 * y modificar cada vez que aparece una regla nueva (viola SRP y OCP).
 *
 * Solución: cada regla es una clase pequeña (un "eslabón"). Los eslabones se
 * enlazan en una cadena; la solicitud recorre la cadena y el primer eslabón
 * que encuentra un problema lanza un error que detiene el recorrido.
 *
 *   MedicoDisponible → FechaNoPasada → Ventana → DiaAtencion → Franja → TurnoLibre → UnaCitaPorDia
 *
 * Agregar una regla (por ejemplo, "no agendar en festivos") es escribir una
 * clase nueva y enlazarla. Las demás no se tocan.
 *
 * Además, `validar` es un TEMPLATE METHOD: define el algoritmo fijo
 * ("verifico yo y luego paso al siguiente") y deja a cada subclase solo el
 * paso variable (`verificar`).
 */
export abstract class ReglaAgendamiento {
  private siguiente?: ReglaAgendamiento;

  /** Enlaza el siguiente eslabón y lo retorna para encadenar con fluidez. */
  enlazar(siguiente: ReglaAgendamiento): ReglaAgendamiento {
    this.siguiente = siguiente;
    return siguiente;
  }

  async validar(solicitud: SolicitudAgendamiento): Promise<void> {
    await this.verificar(solicitud);
    await this.siguiente?.validar(solicitud);
  }

  /** Lanza un DomainError si la solicitud viola esta regla. */
  protected abstract verificar(solicitud: SolicitudAgendamiento): Promise<void> | void;
}

/** Construye una cadena a partir de una lista ordenada de reglas. */
export function encadenar(reglas: ReglaAgendamiento[]): ReglaAgendamiento {
  if (reglas.length === 0) throw new Error('La cadena de reglas no puede estar vacía');
  reglas.reduce((anterior, actual) => anterior.enlazar(actual));
  return reglas[0];
}
