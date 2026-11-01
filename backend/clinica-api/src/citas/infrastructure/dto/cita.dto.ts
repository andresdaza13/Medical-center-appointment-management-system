import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsPositive, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { Especialidad } from '../../../medicos/domain/medico';
import { Cita } from '../../domain/cita';
import { FranjaLibre } from '../../domain/calculadora-disponibilidad';
import { Sugerencia } from '../../application/disponibilidad.service';

const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class AgendarCitaDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  medicoId!: number;

  @IsISO8601({ strict: true })
  fecha!: string;

  @Matches(HORA, { message: 'hora debe tener formato HH:mm' })
  hora!: string;

  /** Solo lo envía el personal; si lo envía un paciente se ignora. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  pacienteId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacion?: string;
}

/** Query de RF1, RF4 y disponibilidad: ?medicoId=1&fecha=2026-11-03 */
export class MedicoFechaQuery {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  medicoId!: number;

  @IsISO8601({ strict: true })
  fecha!: string;
}

export class HistorialQuery {
  @Matches(/^\d{5,12}$/, { message: 'documento debe tener entre 5 y 12 dígitos' })
  documento!: string;
}

export class SugerenciasQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  medicoId?: number;

  @IsOptional()
  @IsEnum(Especialidad)
  especialidad?: Especialidad;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  limite?: number;
}

export class CitaResponseDto {
  id!: number;
  medicoId!: number;
  pacienteId!: number;
  fecha!: string;
  hora!: string;
  estado!: string;
  observacion?: string;

  static desde(c: Cita): CitaResponseDto {
    return {
      id: c.id!,
      medicoId: c.medicoId,
      pacienteId: c.pacienteId,
      fecha: c.fecha.toString(),
      hora: c.hora.toString(),
      estado: c.estado,
      observacion: c.observacion,
    };
  }
}

export const franjaDto = (f: FranjaLibre) => ({ fecha: f.fecha.toString(), hora: f.hora.toString() });

export const sugerenciaDto = (s: Sugerencia) => ({
  medicoId: s.medico.id!,
  medicoNombres: s.medico.nombres,
  especialidad: s.medico.especialidad,
  ...franjaDto(s.franja),
});
