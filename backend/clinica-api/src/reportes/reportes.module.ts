import { Module } from '@nestjs/common';
import { CitasModule } from '../citas/citas.module';
import { ReporteCitasService } from './application/reporte-citas.service';
import { ReportesController } from './infrastructure/reportes.controller';

/** Módulo Reportes (RF7). Solo lee, y solo a través de la API pública de Citas. */
@Module({
  imports: [CitasModule],
  controllers: [ReportesController],
  providers: [ReporteCitasService],
})
export class ReportesModule {}