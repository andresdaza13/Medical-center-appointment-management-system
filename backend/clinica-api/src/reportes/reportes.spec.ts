import { EstadoCita } from '../citas/domain/cita';
import { ConsultarCitasService } from '../citas/application/consultar-citas.service';
import { MedicosService } from '../medicos/application/medicos.service';
import { PacientesService } from '../pacientes/application/pacientes.service';
import { DatoInvalidoError } from '../shared/domain/errors';
import {
  CitaConsultasEnMemoria,
  MedicoRepositoryEnMemoria,
  PacienteRepositoryEnMemoria,
  RelojFijo,
  unaCitaDetalle,
} from '../testing/dobles';
import { ReporteCitasService } from './application/reporte-citas.service';
import { armarReporteCitasPorMes } from './domain/reporte-citas-por-mes';

describe('armarReporteCitasPorMes (dominio, función pura)', () => {
  it('completa con 0 los meses sin citas: siempre 12 valores por médico', () => {
    const reporte = armarReporteCitasPorMes(2026, [
      { medicoId: 1, medicoNombre: 'Clara', mes: 3, cantidad: 4 },
      { medicoId: 1, medicoNombre: 'Clara', mes: 11, cantidad: 2 },
    ]);

    expect(reporte.series).toHaveLength(1);
    expect(reporte.series[0].citasPorMes).toEqual([0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 2, 0]);
    expect(reporte.series[0].total).toBe(6);
  });

  it('crea una serie por médico, ordenadas por nombre, y suma el total general', () => {
    const reporte = armarReporteCitasPorMes(2026, [
      { medicoId: 2, medicoNombre: 'José', mes: 1, cantidad: 5 },
      { medicoId: 1, medicoNombre: 'Armando', mes: 1, cantidad: 3 },
    ]);

    expect(reporte.series.map((s) => s.medico)).toEqual(['Armando', 'José']);
    expect(reporte.totalGeneral).toBe(8);
  });

  it('un año sin citas produce un reporte vacío (el frontend muestra el estado vacío)', () => {
    expect(armarReporteCitasPorMes(2025, [])).toEqual({ anio: 2025, series: [], totalGeneral: 0 });
  });
});

describe('ReporteCitasService (RF7)', () => {
  // El reloj fijo marca 2026-11-02.
  function escenario() {
    const reloj = new RelojFijo();
    const consultas = new CitaConsultasEnMemoria([
      unaCitaDetalle({ id: 1, fecha: '2026-03-10' }),
      unaCitaDetalle({ id: 2, fecha: '2026-03-12', hora: '07:20' }),
      unaCitaDetalle({ id: 3, fecha: '2026-11-04', estado: EstadoCita.ATENDIDA }),
      unaCitaDetalle({ id: 4, fecha: '2026-11-05', estado: EstadoCita.CANCELADA }),
      unaCitaDetalle({ id: 5, fecha: '2025-12-01' }),
      unaCitaDetalle({ id: 6, fecha: '2026-03-10', medico: { id: 2, nombres: 'Médico 2', especialidad: 'FISIOTERAPIA' } }),
    ]);
    const consultar = new ConsultarCitasService(
      consultas,
      new MedicosService(new MedicoRepositoryEnMemoria()),
      new PacientesService(new PacienteRepositoryEnMemoria(), reloj),
      reloj,
    );
    return new ReporteCitasService(consultar, reloj);
  }

  it('cuenta por mes y médico las citas del año pedido', async () => {
    const reporte = await escenario().citasPorMes(2026);

    const medico1 = reporte.series.find((s) => s.medicoId === 1)!;
    expect(medico1.citasPorMes[2]).toBe(2); // marzo
    expect(medico1.citasPorMes[10]).toBe(1); // noviembre: la atendida cuenta
    expect(reporte.series.find((s) => s.medicoId === 2)!.total).toBe(1);
    expect(reporte.totalGeneral).toBe(4);
  });

  it('las citas CANCELADAS no cuentan', async () => {
    const reporte = await escenario().citasPorMes(2026);
    expect(reporte.series.find((s) => s.medicoId === 1)!.total).toBe(3);
  });

  it('sin año usa el año actual', async () => {
    expect((await escenario().citasPorMes()).anio).toBe(2026);
  });

  it('separa los años: diciembre de 2025 no aparece en 2026', async () => {
    const reporte = await escenario().citasPorMes(2025);
    expect(reporte.totalGeneral).toBe(1);
    expect(reporte.series[0].citasPorMes[11]).toBe(1);
  });

  it.each([2019, 2028])('rechaza el año %i (fuera de rango)', async (anio) => {
    await expect(escenario().citasPorMes(anio)).rejects.toThrow(DatoInvalidoError);
  });
});