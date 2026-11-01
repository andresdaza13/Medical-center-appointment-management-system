import { Module } from '@nestjs/common';
import { PacientesService } from './application/pacientes.service';
import { PACIENTE_REPOSITORY } from './domain/paciente.repository';
import { PacientesController } from './infrastructure/pacientes.controller';
import { PrismaPacienteRepository } from './infrastructure/prisma-paciente.repository';

/**
 * Módulo Pacientes del monolito modular.
 *
 * Aquí se hace el "cableado" de la arquitectura hexagonal: se le dice a Nest
 * que cuando alguien pida PACIENTE_REPOSITORY (el puerto) entregue
 * PrismaPacienteRepository (el adaptador). Cambiar de base de datos es cambiar
 * esta línea.
 *
 * Solo se exporta el SERVICIO: otros módulos (Citas) usan Pacientes a través de
 * su API pública, nunca tocando su repositorio ni sus tablas directamente.
 */
@Module({
  controllers: [PacientesController],
  providers: [PacientesService, { provide: PACIENTE_REPOSITORY, useClass: PrismaPacienteRepository }],
  exports: [PacientesService],
})
export class PacientesModule {}
