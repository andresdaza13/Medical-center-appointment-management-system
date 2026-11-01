import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  // Cabeceras HTTP de seguridad (X-Content-Type-Options, X-Frame-Options,
  // Strict-Transport-Security, etc.). Corrige varias alertas de OWASP ZAP.
  app.use(helmet());

  app.enableCors({
    origin: config.getOrThrow<string>('CORS_ORIGINS').split(',').map((o) => o.trim()),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    exposedHeaders: ['Content-Disposition'], // para que el front lea el nombre del CSV
  });

  app.setGlobalPrefix('api');

  // Validación de TODA entrada contra los DTO:
  //  - whitelist: elimina propiedades no declaradas en el DTO
  //  - forbidNonWhitelisted: y además responde 400 si llegan (mass assignment)
  //  - transform: convierte "5" → 5 según los tipos del DTO
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
  new Logger('Bootstrap').log(`API de Piedrazul en http://localhost:${port}/api`);
}

void bootstrap();
