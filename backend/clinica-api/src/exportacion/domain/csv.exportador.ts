import { ReporteTabular } from './exportador';
import { ExportadorTabular } from './exportador-tabular';

/**
 * Estrategia CSV (RF4): "formato de texto compatible con hojas de cálculo".
 *
 * Decisiones:
 *  - Separador ';' porque Excel con configuración regional de Colombia usa la
 *    coma como separador decimal y espera ';' entre columnas.
 *  - BOM UTF-8 al inicio: sin él, Excel muestra "PeÃ±a" en vez de "Peña".
 *  - CRLF como salto de línea, según el estándar RFC 4180.
 *  - Protección contra CSV INJECTION (OWASP): si una celda empieza por
 *    = + - @ Excel la ejecuta como fórmula. Un paciente malicioso podría
 *    registrar como nombre `=HYPERLINK("http://malo")`. Se neutraliza
 *    anteponiendo un apóstrofo.
 */
export class CsvExportador extends ExportadorTabular {
  readonly formato = 'csv';
  protected readonly mimeType = 'text/csv; charset=utf-8';
  protected readonly extension = 'csv';

  private static readonly BOM = '﻿';
  private static readonly INICIO_FORMULA = /^[=+\-@\t\r]/;

  constructor(private readonly separador = ';') {
    super();
  }

  protected formatearEncabezado(reporte: ReporteTabular): string[] {
    return [this.unir(reporte.columnas)];
  }

  protected formatearFila(fila: string[]): string {
    return this.unir(fila);
  }

  protected override prefijo(): string {
    return CsvExportador.BOM;
  }

  protected override saltoDeLinea(): string {
    return '\r\n';
  }

  private unir(celdas: string[]): string {
    return celdas.map((c) => this.escapar(c)).join(this.separador);
  }

  /** Escapa una celda según RFC 4180 y la protege contra inyección de fórmulas. */
  escapar(valor: string): string {
    let celda = valor ?? '';
    if (CsvExportador.INICIO_FORMULA.test(celda)) {
      celda = `'${celda}`;
    }
    const requiereComillas = celda.includes(this.separador) || /["\r\n]/.test(celda);
    return requiereComillas ? `"${celda.replace(/"/g, '""')}"` : celda;
  }
}
