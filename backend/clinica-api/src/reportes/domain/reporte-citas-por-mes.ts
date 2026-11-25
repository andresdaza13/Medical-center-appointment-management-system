import { ConteoMensual } from '../../citas/domain/cita-consultas';

/** Una serie del gráfico: un médico con sus 12 meses. */
export interface SerieMedico {
  medicoId: number;
  medico: string;
  /** Posición 0 = enero … 11 = diciembre. Siempre 12 valores. */
  citasPorMes: number[];
  total: number;
}

/** RF7: reporte de cantidad de citas por mes y médico en un año. */
export interface ReporteCitasPorMes {
  anio: number;
  series: SerieMedico[];
  totalGeneral: number;
}

/**
 * Arma el reporte a partir de los conteos que trae la base de datos.
 *
 * La base solo devuelve los meses QUE TIENEN citas; aquí se completan con 0
 * los que faltan, para que el frontend reciba siempre 12 meses por médico y
 * no tenga que adivinar huecos. Es una función pura: sin base de datos, sin
 * fechas del sistema, fácil de probar.
 */
export function armarReporteCitasPorMes(anio: number, conteos: ConteoMensual[]): ReporteCitasPorMes {
  const porMedico = new Map<number, SerieMedico>();

  for (const c of conteos) {
    const serie = porMedico.get(c.medicoId) ?? {
      medicoId: c.medicoId,
      medico: c.medicoNombre,
      citasPorMes: Array<number>(12).fill(0),
      total: 0,
    };
    serie.citasPorMes[c.mes - 1] += c.cantidad;
    serie.total += c.cantidad;
    porMedico.set(c.medicoId, serie);
  }

  const series = [...porMedico.values()].sort((a, b) => a.medico.localeCompare(b.medico, 'es'));

  return {
    anio,
    series,
    totalGeneral: series.reduce((suma, s) => suma + s.total, 0),
  };
}