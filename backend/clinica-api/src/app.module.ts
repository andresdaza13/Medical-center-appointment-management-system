import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard, RolesGuard } from './auth/infrastructure/guards';
import { CitasModule } from './citas/citas.module';
import { validarEntorno } from './config/env.validation';
import { ConfiguracionModule } from './configuracion/configuracion.module';
import { ExportacionModule } from './exportacion/exportacion.module';
import { MedicosModule } from './medicos/medicos.module';
import { PacientesModule } from './pacientes/pacientes.module';
import { DomainExceptionFilter } from './shared/infrastructure/http/domain-exception.filter';
import { SharedModule } from './shared/shared.module';

/**
 * Raíz del MONOLITO MODULAR.
 *
 * Un solo proceso desplegable, pero dividido en módulos por capacidad de
 * negocio (pacientes, médicos, configuración, citas, exportación) con
 * fronteras explícitas. Cada módulo tiene sus capas domain / application /
 * infrastructure.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validarEntorno }),
    // RNF seguridad / requisito del proyecto 4-ii: limita el uso automatizado.
    // Máx. 100 peticiones por minuto por IP; los endpoints sensibles bajan este límite.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    SharedModule,
    AuthModule,
    PacientesModule,
    MedicosModule,
    ConfiguracionModule,
    CitasModule,
    ExportacionModule,
  ],
  providers: [
    // La cadena de guards se ejecuta en el orden en que se registran.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class AppModule {}
