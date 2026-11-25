import { Inject, Injectable } from '@nestjs/common';
import { ConsultarCitasService } from '../../citas/application/consultar-citas.service';
import { Reloj, RELOJ } from '../../shared/application/reloj.port';
import { DatoInvalidoError } from '../../shared/domain/errors';
import { armarReporteCitasPorMes, ReporteCitasPorMes } from '../domain/reporte-citas-por-mes';

/** Primer año con datos que tiene sentido consultar. */
export const ANIO_MINIMO_REPORTE = 2020;

/**
 * Caso de uso RF7: reporte de citas por mes y médico.
 *
 * Como Exportación, este módulo NO lee las tablas de citas: usa la API
 * pública del módulo Citas (ConsultarCitasService). Así las fronteras del
 * monolito modular se respetan.
 */
@Injectable()
export class ReporteCitasService {
  constructor(
    private readonly citas: ConsultarCitasService,
    @Inject(RELOJ) private readonly reloj: Reloj,
  ) {}

  async citasPorMes(anio?: number): Promise<ReporteCitasPorMes> {
    const anioActual = this.reloj.hoy().anio;
    const consultado = anio ?? anioActual; // por defecto, el año en curso

    // Hasta el año siguiente: las citas futuras ya agendadas también cuentan.
    if (consultado < ANIO_MINIMO_REPORTE || consultado > anioActual + 1) {
      throw new DatoInvalidoError(`El año debe estar entre ${ANIO_MINIMO_REPORTE} y ${anioActual + 1}`);
    }

    const conteos = await this.citas.conteoPorMesYMedico(consultado);
    return armarReporteCitasPorMes(consultado, conteos);
  }
}