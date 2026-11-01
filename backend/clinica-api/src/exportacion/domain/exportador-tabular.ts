import { ArchivoExportado, Exportador, ReporteTabular } from './exportador';

/**
 * PATRÓN TEMPLATE METHOD (GoF, comportamiento).
 *
 * Todos los formatos de texto tabular siguen el mismo ALGORITMO:
 *
 *   1. prefijo del archivo   (p. ej. BOM para que Excel lea las tildes)
 *   2. encabezado
 *   3. una línea por fila
 *   4. pie / resumen
 *   5. unir con saltos de línea y codificar en UTF-8
 *
 * `exportar()` fija ese algoritmo y es `final` en la práctica (no se
 * sobreescribe). Las subclases solo implementan los PASOS que cambian
 * (formatearEncabezado, formatearFila...). Así no se repite el esqueleto en
 * cada formato.
 */
export abstract class ExportadorTabular implements Exportador {
  abstract readonly formato: string;
  protected abstract readonly mimeType: string;
  protected abstract readonly extension: string;

  exportar(reporte: ReporteTabular): ArchivoExportado {
    const lineas = [
      ...this.formatearEncabezado(reporte),
      ...reporte.filas.map((fila) => this.formatearFila(fila, reporte)),
      ...this.formatearPie(reporte),
    ];
    const texto = this.prefijo() + lineas.join(this.saltoDeLinea());

    return {
      contenido: Buffer.from(texto, 'utf-8'),
      mimeType: this.mimeType,
      extension: this.extension,
    };
  }

  // ---- Pasos que las subclases deben implementar ---------------------------
  protected abstract formatearEncabezado(reporte: ReporteTabular): string[];
  protected abstract formatearFila(fila: string[], reporte: ReporteTabular): string;

  // ---- "Hooks": pasos con comportamiento por defecto, opcionales ----------
  protected formatearPie(_reporte: ReporteTabular): string[] {
    return [];
  }

  protected prefijo(): string {
    return '';
  }

  protected saltoDeLinea(): string {
    return '\n';
  }
}
