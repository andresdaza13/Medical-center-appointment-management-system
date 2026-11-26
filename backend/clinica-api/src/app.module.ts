import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard, RolesGuard } from './auth/infrastructure/guards';
import { CitasModule } from './citas/citas.module';
import { validarEntorno } from './config/env.validation';
import { ConfiguracionModule } from './configuracion/configuracion.module';
import { ExportacionModule } from './exportacion/exportacion.module';
import { MedicosModule } from './medicos/medicos.module';
import { PacientesModule } from './pacientes/pacientes.module';
import { ReportesModule } from './reportes/reportes.module';
import { DomainExceptionFilter } from './shared/infrastructure/http/domain-exception.filter';
import { SharedModule } from './shared/shared.module';
import { SaludModule } from './salud/salud.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validarEntorno }),
    
    // --- LOGS ESTRUCTURADOS (RNF6) ---
    LoggerModule.forRoot({
      pinoHttp: {
        genReqId: (req) => (req.headers['x-request-id'] as string) || randomUUID(),
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password'],
          censor: '[REDACTED]',
        },
        customProps: (req: any) => {
          return { user: req.user?.preferred_username || req.user?.sub || 'anon' };
        },
        transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
      },
    }),
    // ---------------------------------

    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    SharedModule,
    AuthModule,
    PacientesModule,
    MedicosModule,
    ConfiguracionModule,
    CitasModule,
    ExportacionModule,
    ReportesModule,
    SaludModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
  ],
})
export class AppModule {}