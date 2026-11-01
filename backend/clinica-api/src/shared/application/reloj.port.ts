import { FechaCalendario } from '../domain/fecha-calendario';
import { HoraDelDia } from '../domain/hora-del-dia';

/**
 * PUERTO (interfaz) para obtener la fecha y hora actuales.
 *
 * Si un servicio llama `new Date()` directamente, sus pruebas dependen del día
 * en que se ejecuten. Al depender de esta abstracción (DIP de SOLID), las
 * pruebas inyectan un reloj fijo y el resultado es siempre el mismo.
 */
export interface Reloj {
  hoy(): FechaCalendario;
  horaActual(): HoraDelDia;
}

/**
 * Las interfaces de TypeScript desaparecen al compilar, así que Nest no puede
 * usarlas como clave de inyección. Por eso cada puerto exporta un token.
 */
export const RELOJ = Symbol('RELOJ');
