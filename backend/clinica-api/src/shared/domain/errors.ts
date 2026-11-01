/**
 * Errores del DOMINIO.
 *
 * El dominio no sabe nada de HTTP: no lanza NotFoundException ni devuelve 404.
 * Lanza errores con significado de negocio y un filtro de infraestructura
 * (DomainExceptionFilter) los traduce a códigos HTTP.
 *
 * Así el mismo caso de uso podría exponerse mañana por HTTP, por una cola de
 * mensajes o por una CLI sin cambiar una línea del dominio (principio OCP y
 * separación de capas).
 */
export abstract class DomainError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** El recurso pedido no existe. */
export class RecursoNoEncontradoError extends DomainError {
  constructor(recurso: string, id: string | number) {
    super(`${recurso} con identificador "${id}" no existe`);
  }
}

/** Un dato entrante viola una invariante (formato, rango, etc.). */
export class DatoInvalidoError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

/** Se intentó una operación que una regla de negocio no permite. */
export class ReglaNegocioError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

/** La operación choca con el estado actual (p. ej. turno ya ocupado). */
export class ConflictoError extends DomainError {
  constructor(message: string) {
    super(message);
  }
}

/** El usuario autenticado no puede actuar sobre este recurso concreto. */
export class AccesoDenegadoError extends DomainError {
  constructor(message = 'No tiene permiso sobre este recurso') {
    super(message);
  }
}
