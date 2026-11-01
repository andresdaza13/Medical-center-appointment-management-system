import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { Especialidad, Medico, TipoProfesional } from '../../domain/medico';

const HORA = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class GuardarMedicoDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  nombres!: string;

  @IsEnum(TipoProfesional)
  tipo!: TipoProfesional;

  @IsEnum(Especialidad)
  especialidad!: Especialidad;
}

export class CambiarEstadoMedicoDto {
  @IsBoolean()
  activo!: boolean;
}

export class ConfigurarHorarioDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  diasAtencion!: number[];

  @Matches(HORA, { message: 'horaInicio debe tener formato HH:mm' })
  horaInicio!: string;

  @Matches(HORA, { message: 'horaFin debe tener formato HH:mm' })
  horaFin!: string;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(240)
  intervaloMinutos!: number;
}

export class FiltroMedicosQuery {
  @IsOptional()
  @IsEnum(Especialidad)
  especialidad?: Especialidad;
}

export class MedicoResponseDto {
  id!: number;
  nombres!: string;
  tipo!: TipoProfesional;
  especialidad!: Especialidad;
  activo!: boolean;
  horario!: {
    diasAtencion: number[];
    horaInicio: string;
    horaFin: string;
    intervaloMinutos: number;
  } | null;

  static desde(m: Medico): MedicoResponseDto {
    const h = m.horario;
    return {
      id: m.id!,
      nombres: m.nombres,
      tipo: m.tipo,
      especialidad: m.especialidad,
      activo: m.activo,
      horario: h
        ? {
            diasAtencion: h.diasAtencion,
            horaInicio: h.horaInicio.toString(),
            horaFin: h.horaFin.toString(),
            intervaloMinutos: h.intervaloMinutos,
          }
        : null,
    };
  }
}
