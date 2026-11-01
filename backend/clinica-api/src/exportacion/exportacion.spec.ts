import { ConsultarCitasService } from '../citas/application/consultar-citas.service';
import { DatoInvalidoError } from '../shared/domain/errors';
import {
  CitaConsultasEnMemoria,
  MedicoRepositoryEnMemoria,
  PacienteRepositoryEnMemoria,
  RelojFijo,
  unaCitaDetalle,
  unMedico,
} from '../testing/dobles';
import { MedicosService } from '../medicos/application/medicos.service';
import { PacientesService } from '../pacientes/application/pacientes.service';
import { ExportarAgendaService } from './application/exportar-agenda.service';
import { CsvExportador } from './domain/csv.exportador';
import { ReporteTabular } from './domain/exportador';
import { FabricaExportadores } from './domain/fabrica-exportadores';
import { TextoPlanoExportador } from './domain/texto-plano.exportador';

const reporte: ReporteTabular = {
  titulo: 'Citas',
  columnas: ['Hora', 'Paciente'],
  filas: [
    ['07:00', 'Lucy Chávez'],
    ['07:05', 'Peña; Héctor'],
  ],
  resumen: 'Total citas: 2',
};

describe('CsvExportador (Strategy + Template Method)', () => {
  const csv = new CsvExportador();
  const texto = (r = reporte) => csv.exportar(r).contenido.toString('utf-8');

  it('genera BOM, encabezado y filas separadas por ";" con CRLF', () => {
    expect(texto()).toBe('﻿Hora;Paciente\r\n07:00;Lucy Chávez\r\n07:05;"Peña; Héctor"');
  });

  it('declara el tipo MIME y la extensión', () => {
    const archivo = csv.exportar(reporte);
    expect(archivo.mimeType).toContain('text/csv');
    expect(archivo.extension).toBe('csv');
  });

  it('escapa comillas y saltos de línea (RFC 4180)', () => {
    expect(csv.escapar('dijo "hola"')).toBe('"dijo ""hola"""');
    expect(csv.escapar('línea 1\nlínea 2')).toBe('"línea 1\nlínea 2"');
  });

  it.each(['=1+1', '+57', '-2', '@SUM(A1)'])('neutraliza la inyección de fórmulas: %s', (valor) => {
    expect(csv.escapar(valor).startsWith("'")).toBe(true);
  });
});

describe('TextoPlanoExportador', () => {
  it('alinea columnas e incluye título y resumen', () => {
    const t = new TextoPlanoExportador().exportar(reporte).contenido.toString('utf-8').split('\n');
    expect(t[0]).toBe('Citas');
    expect(t[2]).toBe('Hora   Paciente');
    expect(t[4]).toBe('07:00  Lucy Chávez');
    expect(t[t.length - 1]).toBe('Total citas: 2');
  });
});

describe('FabricaExportadores (Factory)', () => {
  const fabrica = new FabricaExportadores([new CsvExportador(), new TextoPlanoExportador()]);

  it('entrega la estrategia según el formato, sin importar mayúsculas', () => {
    expect(fabrica.obtener('CSV')).toBeInstanceOf(CsvExportador);
    expect(fabrica.obtener('txt')).toBeInstanceOf(TextoPlanoExportador);
  });

  it('rechaza formatos no registrados indicando los disponibles', () => {
    expect(() => fabrica.obtener('pdf')).toThrow(DatoInvalidoError);
    expect(() => fabrica.obtener('pdf')).toThrow(/csv, txt/);
  });

  it('no admite dos estrategias para el mismo formato', () => {
    expect(() => new FabricaExportadores([new CsvExportador(), new CsvExportador()])).toThrow();
  });
});

describe('ExportarAgendaService (RF4)', () => {
  function crear() {
    const reloj = new RelojFijo();
    const medicos = new MedicoRepositoryEnMemoria();
    medicos.datos.push(unMedico(1));
    const consultas = new CitaConsultasEnMemoria([unaCitaDetalle({ id: 1, observacion: '=malicioso' })]);
    const consultar = new ConsultarCitasService(
      consultas,
      new MedicosService(medicos),
      new PacientesService(new PacienteRepositoryEnMemoria(), reloj),
      reloj,
    );
    return new ExportarAgendaService(consultar, new FabricaExportadores([new CsvExportador(), new TextoPlanoExportador()]));
  }

  it('exporta la agenda de un médico en una fecha a CSV con nombre de archivo seguro', async () => {
    const archivo = await crear().exportar(1, '2026-11-04', 'csv');
    const contenido = archivo.contenido.toString('utf-8');

    expect(archivo.nombreArchivo).toBe('citas_medico-1_2026-11-04.csv');
    expect(contenido).toContain('Hora;Documento;Paciente;Celular;Edad;Estado;Observación');
    expect(contenido).toContain("07:00;1061000001;Lucy Chávez;3001234567;68;AGENDADA;'=malicioso");
  });

  it('falla antes de consultar si el formato no existe', async () => {
    await expect(crear().exportar(1, '2026-11-04', 'xls')).rejects.toThrow(DatoInvalidoError);
  });
});
