import { Paciente } from './paciente';

/**
 * PUERTO de salida (patrón Repository).
 *
 * El dominio declara QUÉ necesita ("buscar un paciente por documento") sin
 * decir CÓMO (Prisma, SQL, Mongo, memoria...). La implementación concreta es un
 * adaptador en /infrastructure.
 *
 * Beneficios concretos:
 *  - DIP (SOLID): el servicio depende de esta interfaz, no de Prisma.
 *  - Pruebas: se reemplaza por un repositorio en memoria, sin mocks frágiles.
 *  - ISP (SOLID): solo expone las operaciones que el dominio usa.
 */
export interface PacienteRepository {
  buscarPorId(id: number): Promise<Paciente | null>;
  buscarPorDocumento(documento: string): Promise<Paciente | null>;
  buscarPorKeycloakId(keycloakId: string): Promise<Paciente | null>;
  /** Autocompletado: pacientes cuyo documento empieza por `prefijo`. */
  buscarPorPrefijoDocumento(prefijo: string, limite: number): Promise<Paciente[]>;
  /** Inserta o actualiza. Lanza ConflictoError si el documento ya existe. */
  guardar(paciente: Paciente): Promise<Paciente>;
}

export const PACIENTE_REPOSITORY = Symbol('PACIENTE_REPOSITORY');
