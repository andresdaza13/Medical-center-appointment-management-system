import { Global, Module } from '@nestjs/common';
import { RELOJ } from './application/reloj.port';
import { PrismaService } from './infrastructure/prisma/prisma.service';
import { RelojSistema } from './infrastructure/reloj-sistema';

/**
 * Núcleo compartido (shared kernel): piezas técnicas que todos los módulos usan.
 * Es @Global para no tener que importarlo en cada módulo.
 */
@Global()
@Module({
  providers: [PrismaService, { provide: RELOJ, useClass: RelojSistema }],
  exports: [PrismaService, RELOJ],
})
export class SharedModule {}
