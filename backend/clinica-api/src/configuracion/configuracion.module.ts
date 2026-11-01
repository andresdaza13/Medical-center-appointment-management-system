import { Module } from '@nestjs/common';
import { ConfiguracionService } from './application/configuracion.service';
import { CONFIGURACION_REPOSITORY } from './domain/configuracion.repository';
import { ConfiguracionController } from './infrastructure/configuracion.controller';
import { PrismaConfiguracionRepository } from './infrastructure/prisma-configuracion.repository';

@Module({
  controllers: [ConfiguracionController],
  providers: [
    ConfiguracionService,
    { provide: CONFIGURACION_REPOSITORY, useClass: PrismaConfiguracionRepository },
  ],
  exports: [ConfiguracionService],
})
export class ConfiguracionModule {}
