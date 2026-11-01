import { ReporteTabular } from './exportador';
import { ExportadorTabular } from './exportador-tabular';

/**
 * Estrategia de texto plano con columnas alineadas, como el listado imprimible
 * del software de escritorio actual (Figura 3 del enunciado).
 *
 * Existe para demostrar que el diseño admite nuevos formatos sin tocar nada
 * más: solo se escribió esta clase y se registró en el módulo.
 */
export class TextoPlanoExportador extends ExportadorTabular {
  readonly formato = 'txt';
  protected readonly mimeType = 'text/plain; charset=utf-8';
  protected readonly extension = 'txt';

  /*
   * Esta instancia es compartida (singleton) por todas las peticiones, así que
   * NO guarda estado propio. Los anchos se calculan por reporte y se cachean
   * en un WeakMap que se libera solo cuando el reporte deja de usarse.
   */
  private readonly anchosPorReporte = new WeakMap<ReporteTabular, number[]>();

  protected formatearEncabezado(reporte: ReporteTabular): string[] {
    const anchos = this.anchos(reporte);
    const linea = '-'.repeat(anchos.reduce((a, b) => a + b + 2, -2));
    return [reporte.titulo, linea, this.alinear(reporte.columnas, anchos), linea];
  }

  protected formatearFila(fila: string[], reporte: ReporteTabular): string {
    return this.alinear(fila, this.anchos(reporte));
  }

  protected override formatearPie(reporte: ReporteTabular): string[] {
    return reporte.resumen ? ['', reporte.resumen] : [];
  }

  /** Ancho de cada columna = el texto más largo entre encabezado y celdas. */
  private anchos(reporte: ReporteTabular): number[] {
    let anchos = this.anchosPorReporte.get(reporte);
    if (!anchos) {
      anchos = reporte.columnas.map((col, i) =>
        Math.max(col.length, ...reporte.filas.map((f) => (f[i] ?? '').length)),
      );
      this.anchosPorReporte.set(reporte, anchos);
    }
    return anchos;
  }

  private alinear(celdas: string[], anchos: number[]): string {
    return celdas.map((c, i) => (c ?? '').padEnd(anchos[i])).join('  ').trimEnd();
  }
}
