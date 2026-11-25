import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { Publico } from '../auth/infrastructure/decorators';
import { PrismaService } from '../shared/infrastructure/prisma/prisma.service';

/**
 * RNF6 (monitoreo): estado de salud del backend.
 *
 * GET /api/health
 *   200 { status: 'ok',    info:  { database: { status: 'up' } }, ... }
 *   503 { status: 'error', error: { database: { status: 'down', ... } }, ... }
 *
 * Lo consultan tres "clientes" que no son personas:
 *   1. El proveedor de nube, para saber si el contenedor arrancó y reiniciarlo si se cae.
 *   2. El pipeline de CD, como smoke test después de desplegar.
 *   3. Un monitor externo de disponibilidad (opcional).
 * Por eso es @Publico() (no lleva token) y @SkipThrottle() (no se le aplica el límite
 * de peticiones). No expone datos sensibles: solo "arriba" o "abajo".
 */
@Controller('health')
@Publico()
@SkipThrottle()
export class SaludController {
  constructor(
    private readonly salud: HealthCheckService,
    private readonly prismaIndicador: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  verificar() {
    // Ejecuta un SELECT 1 contra PostgreSQL: si la base no responde en 3 s, la API no está sana.
    return this.salud.check([() => this.prismaIndicador.pingCheck('database', this.prisma, { timeout: 3000 })]);
  }
}