import { Module } from '@nestjs/common';
import { CitasModule } from '../citas/citas.module';
import { ExportarAgendaService } from './application/exportar-agenda.service';
import { CsvExportador } from './domain/csv.exportador';
import { Exportador, EXPORTADORES } from './domain/exportador';
import { FabricaExportadores } from './domain/fabrica-exportadores';
import { TextoPlanoExportador } from './domain/texto-plano.exportador';
import { ExportacionController } from './infrastructure/exportacion.controller';

/**
 * Registro de estrategias. Para agregar PDF:
 *   1. crear PdfExportador implements Exportador
 *   2. agregarlo a la lista de `EXPORTADORES`
 * Nada más cambia.
 */
@Module({
  imports: [CitasModule],
  controllers: [ExportacionController],
  providers: [
    { provide: EXPORTADORES, useFactory: (): Exportador[] => [new CsvExportador(), new TextoPlanoExportador()] },
    {
      provide: FabricaExportadores,
      useFactory: (exportadores: Exportador[]) => new FabricaExportadores(exportadores),
      inject: [EXPORTADORES],
    },
    ExportarAgendaService,
  ],
})
export class ExportacionModule {}
