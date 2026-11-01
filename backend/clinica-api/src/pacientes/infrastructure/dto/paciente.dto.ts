import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { Reloj } from '../../../shared/application/reloj.port';
import { Genero, Paciente } from '../../domain/paciente';

const recortar = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/**
 * DTO de ENTRADA (Data Transfer Object).
 *
 * Valida la FORMA de la petición antes de que toque el dominio. Con el
 * ValidationPipe global configurado con `whitelist` y `forbidNonWhitelisted`,
 * cualquier campo que no esté declarado aquí produce un 400. Eso evita el
 * ataque de "mass assignment" que permitía la versión anterior (`body: any`).
 */
export class RegistrarPacienteDto {
  @Transform(recortar)
  @Matches(/^\d{5,12}$/, { message: 'documento debe tener entre 5 y 12 dígitos' })
  documento!: string;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombres!: string;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  apellidos!: string;

  @Transform(recortar)
  @Matches(/^3\d{9}$/, { message: 'celular debe tener 10 dígitos e iniciar en 3' })
  celular!: string;

  @IsEnum(Genero)
  genero!: Genero;

  @IsOptional()
  @IsISO8601({ strict: true })
  fechaNacimiento?: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(120)
  email?: string;
}

/**
 * DTO de SALIDA. Decide qué ve el cliente: nunca se serializa la entidad
 * directamente (no se expone, por ejemplo, el keycloakId).
 */
export class PacienteResponseDto {
  id!: number;
  documento!: string;
  nombres!: string;
  apellidos!: string;
  nombreCompleto!: string;
  celular!: string;
  genero!: Genero;
  fechaNacimiento?: string;
  edad?: number;
  email?: string;

  static desde(p: Paciente, reloj: Reloj): PacienteResponseDto {
    return {
      id: p.id!,
      documento: p.documento,
      nombres: p.nombres,
      apellidos: p.apellidos,
      nombreCompleto: p.nombreCompleto,
      celular: p.celular,
      genero: p.genero,
      fechaNacimiento: p.fechaNacimiento?.toString(),
      edad: p.edadEn(reloj.hoy()),
      email: p.email,
    };
  }
}

/** Versión reducida para el autocompletado (minimiza datos personales expuestos). */
export class SugerenciaPacienteDto {
  id!: number;
  documento!: string;
  nombreCompleto!: string;

  static desde(p: Paciente): SugerenciaPacienteDto {
    return { id: p.id!, documento: p.documento, nombreCompleto: p.nombreCompleto };
  }
}
