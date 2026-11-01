import { DatoInvalidoError } from '../../shared/domain/errors';
import { Exportador } from './exportador';

/**
 * PATRÓN FACTORY (fábrica de estrategias).
 *
 * Decide QUÉ estrategia instanciar/entregar a partir de un dato en tiempo de
 * ejecución (el formato que pide el usuario). El código cliente nunca hace
 * `new CsvExportador()` ni un `switch (formato)`: le pide a la fábrica.
 *
 * Las estrategias se registran al construirla (Nest las inyecta como lista),
 * así que agregar un formato no exige modificar esta clase (OCP).
 */
export class FabricaExportadores {
  private readonly registro = new Map<string, Exportador>();

  constructor(exportadores: Exportador[]) {
    for (const e of exportadores) {
      if (this.registro.has(e.formato)) {
        throw new Error(`Formato de exportación duplicado: ${e.formato}`);
      }
      this.registro.set(e.formato, e);
    }
  }

  obtener(formato: string): Exportador {
    const exportador = this.registro.get(formato.toLowerCase());
    if (!exportador) {
      throw new DatoInvalidoError(
        `Formato "${formato}" no soportado. Disponibles: ${this.formatosDisponibles().join(', ')}`,
      );
    }
    return exportador;
  }

  formatosDisponibles(): string[] {
    return [...this.registro.keys()];
  }
}
