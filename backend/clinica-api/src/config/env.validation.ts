import { plainToInstance, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Max, Min, validateSync } from 'class-validator';

/**
 * Variables de entorno obligatorias. Si falta alguna, la aplicación NO arranca
 * y dice exactamente cuál falta ("fail fast"), en lugar de fallar a mitad de
 * una petición con un error confuso.
 */
class Entorno {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT : number = 3000;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL!: string;

  @IsString()
  @IsNotEmpty()
  CORS_ORIGINS!: string;

  @IsUrl({ require_tld: false })
  KEYCLOAK_ISSUER!: string;

  @IsString()
  @IsNotEmpty()
  KEYCLOAK_AUDIENCE!: string;

  @IsOptional()
  @IsString()
  APP_TIMEZONE : string = 'America/Bogota';
}

export function validarEntorno(config: Record<string, unknown>): Entorno {
  const entorno = plainToInstance(Entorno, config, { enableImplicitConversion: true });
  const errores = validateSync(entorno, { skipMissingProperties: false });
  if (errores.length > 0) {
    const detalle = errores.map((e) => `  - ${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`);
    throw new Error(`Configuración de entorno inválida:\n${detalle.join('\n')}`);
  }
  return entorno;
}
