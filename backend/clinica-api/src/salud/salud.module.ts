import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { SaludController } from './salud.controller';

/** Módulo técnico (no de negocio): health check para la nube, el CD y el monitoreo. */
@Module({
  imports: [TerminusModule],
  controllers: [SaludController],
})
export class SaludModule {}