import { Injectable } from '@nestjs/common';
import { AgendaDelDia, ConsultarCitasService } from '../../citas/application/consultar-citas.service';
import { ArchivoExportado, ReporteTabular } from '../domain/exportador';
import { FabricaExportadores } from '../domain/fabrica-exportadores';

export interface AgendaExportada extends ArchivoExportado {
  nombreArchivo: string;
}

/**
 * Caso de uso RF4: exportar las citas de un médico en una fecha.
 *
 * Reutiliza la consulta del RF1 (no duplica la query) y delega el formato a
 * la estrategia que entregue la fábrica.
 */
@Injectable()
export class ExportarAgendaService {
  static readonly COLUMNAS = ['Hora', 'Documento', 'Paciente', 'Celular', 'Edad', 'Estado', 'Observación'];

  constructor(
    private readonly consultas: ConsultarCitasService,
    private readonly fabrica: FabricaExportadores,
  ) {}

  async exportar(medicoId: number, fecha: string, formato: string): Promise<AgendaExportada> {
    const exportador = this.fabrica.obtener(formato); // falla rápido si el formato no existe
    const agenda = await this.consultas.agendaDelDia(medicoId, fecha);
    const archivo = exportador.exportar(ExportarAgendaService.aReporte(agenda));

    return {
      ...archivo,
      nombreArchivo: `citas_${slug(agenda.medico.nombres)}_${agenda.fecha}.${archivo.extension}`,
    };
  }

  formatosDisponibles(): string[] {
    return this.fabrica.formatosDisponibles();
  }

  static aReporte(agenda: AgendaDelDia): ReporteTabular {
    return {
      titulo: `Citas de ${agenda.medico.nombres} - ${agenda.fecha}`,
      columnas: ExportarAgendaService.COLUMNAS,
      filas: agenda.citas.map((c) => [
        c.hora,
        c.paciente.documento,
        c.paciente.nombreCompleto,
        c.paciente.celular,
        c.paciente.edad?.toString() ?? '',
        c.estado,
        c.observacion ?? '',
      ]),
      resumen: `Total citas: ${agenda.total}`,
    };
  }
}

/** "Clara Inés Córdoba" → "clara-ines-cordoba" (nombre de archivo seguro). */
function slug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
