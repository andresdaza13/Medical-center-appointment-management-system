/** Datos a exportar, independientes del formato final. */
export interface ReporteTabular {
  titulo: string;
  columnas: string[];
  filas: string[][];
  /** Línea de resumen opcional (p. ej. "Total citas: 49"). */
  resumen?: string;
}

export interface ArchivoExportado {
  contenido: Buffer;
  mimeType: string;
  extension: string;
}

/**
 * PATRÓN STRATEGY (GoF, comportamiento).
 *
 * "Exportar" es siempre la misma operación, pero hay varias formas
 * (estrategias) de hacerlo: CSV para hojas de cálculo, texto plano para
 * imprimir... El servicio trabaja contra esta interfaz y no sabe cuál
 * estrategia concreta está usando.
 *
 * Mañana se agrega PDF o Excel escribiendo una clase nueva que implemente esta
 * interfaz; el servicio y el controlador NO cambian (OCP).
 */
export interface Exportador {
  /** Identificador que el cliente usa para pedir el formato (?formato=csv). */
  readonly formato: string;
  exportar(reporte: ReporteTabular): ArchivoExportado;
}

/** Token de inyección para la LISTA de todas las estrategias disponibles. */
export const EXPORTADORES = Symbol('EXPORTADORES');
