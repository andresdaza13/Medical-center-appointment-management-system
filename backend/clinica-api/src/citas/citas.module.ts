import { Module } from '@nestjs/common';
import { ConfiguracionModule } from '../configuracion/configuracion.module';
import { MedicosModule } from '../medicos/medicos.module';
import { PacientesModule } from '../pacientes/pacientes.module';
import { AgendarCitaService } from './application/agendar-cita.service';
import { ConsultarCitasService } from './application/consultar-citas.service';
import { DisponibilidadService } from './application/disponibilidad.service';
import { CITA_CONSULTAS } from './domain/cita-consultas';
import { CITA_REPOSITORY } from './domain/cita.repository';
import { CitasController } from './infrastructure/citas.controller';
import { PrismaCitaConsultas } from './infrastructure/prisma-cita-consultas';
import { PrismaCitaRepository } from './infrastructure/prisma-cita.repository';

/**
 * Módulo Citas. Depende de Médicos, Pacientes y Configuración SOLO a través
 * de los servicios que esos módulos exportan (su API pública). Nunca lee sus
 * tablas directamente: así cada módulo podría extraerse a un microservicio
 * en el futuro sin reescribir los demás.
 */
@Module({
  imports: [MedicosModule, PacientesModule, ConfiguracionModule],
  controllers: [CitasController],
  providers: [
    AgendarCitaService,
    ConsultarCitasService,
    DisponibilidadService,
    { provide: CITA_REPOSITORY, useClass: PrismaCitaRepository },
    { provide: CITA_CONSULTAS, useClass: PrismaCitaConsultas },
  ],
  exports: [ConsultarCitasService],
})
export class CitasModule {}
