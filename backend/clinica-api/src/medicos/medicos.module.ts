import { Module } from '@nestjs/common';
import { MedicosService } from './application/medicos.service';
import { MEDICO_REPOSITORY } from './domain/medico.repository';
import { MedicosController } from './infrastructure/medicos.controller';
import { PrismaMedicoRepository } from './infrastructure/prisma-medico.repository';

@Module({
  controllers: [MedicosController],
  providers: [MedicosService, { provide: MEDICO_REPOSITORY, useClass: PrismaMedicoRepository }],
  exports: [MedicosService],
})
export class MedicosModule {}
