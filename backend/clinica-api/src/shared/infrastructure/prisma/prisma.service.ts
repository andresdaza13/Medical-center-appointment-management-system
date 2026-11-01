import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Conexión única a la base de datos para toda la aplicación.
 *
 * Nest crea los providers como SINGLETON por defecto: hay una sola instancia
 * de PrismaService (y por tanto un solo pool de conexiones) compartida por
 * todos los repositorios. No hace falta implementar el patrón a mano.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

/** Código de error de Prisma cuando se viola una restricción UNIQUE. */
export const PRISMA_UNIQUE_VIOLATION = 'P2002';

export function esViolacionUnica(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    (error as { code?: string }).code === PRISMA_UNIQUE_VIOLATION
  );
}
