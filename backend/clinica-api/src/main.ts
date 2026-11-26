import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';

async function bootstrap() {
  // bufferLogs: true es necesario para que pino capture los logs de arranque de NestJS
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  
  // Decirle a NestJS que use Pino como su sistema de logs
  app.useLogger(app.get(Logger));

  const config = app.get(ConfigService);

  // Cabeceras HTTP de seguridad (X-Content-Type-Options, X-Frame-Options,
  // Strict-Transport-Security, etc.). Corrige varias alertas de OWASP ZAP.
  app.use(helmet());

  app.enableCors({
    origin: config.getOrThrow<string>('CORS_ORIGINS').split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type', 'x-request-id'],
    exposedHeaders: ['Content-Disposition'],
  });

  app.setGlobalPrefix('api');

  // Validación de TODA entrada contra los DTO:
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableShutdownHooks();

  const port = config.get<number>('PORT', 3000);
  await app.listen(port);
}

void bootstrap();