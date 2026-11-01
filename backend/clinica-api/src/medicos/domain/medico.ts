import { DatoInvalidoError, ReglaNegocioError } from '../../shared/domain/errors';
import { FechaCalendario } from '../../shared/domain/fecha-calendario';
import { HoraDelDia } from '../../shared/domain/hora-del-dia';
import { HorarioAtencion } from './horario-atencion';

export enum TipoProfesional {
  MEDICO = 'MEDICO',
  TERAPISTA = 'TERAPISTA',
}

export enum Especialidad {
  TERAPIA_NEURAL = 'TERAPIA_NEURAL',
  QUIROPRAXIA = 'QUIROPRAXIA',
  FISIOTERAPIA = 'FISIOTERAPIA',
}

export interface DatosMedico {
  nombres: string;
  tipo: TipoProfesional;
  especialidad: Especialidad;
}

/**
 * ENTIDAD raíz de agregado Médico/Terapista.
 *
 * El agregado agrupa al profesional y su horario: el horario no se modifica
 * "por fuera", sino pidiéndole al médico que lo cambie (configurarHorario).
 */
export class Medico {
  private constructor(
    private _id: number | undefined,
    private datos: DatosMedico,
    private _activo: boolean,
    private _horario: HorarioAtencion | undefined,
  ) {}

  static crear(datos: DatosMedico): Medico {
    return new Medico(undefined, Medico.validar(datos), true, undefined);
  }

  static reconstituir(id: number, datos: DatosMedico, activo: boolean, horario?: HorarioAtencion): Medico {
    return new Medico(id, datos, activo, horario);
  }

  actualizarDatos(datos: DatosMedico): void {
    this.datos = Medico.validar(datos);
  }

  configurarHorario(horario: HorarioAtencion): void {
    this._horario = horario;
  }

  activar(): void { this._activo = true; }
  desactivar(): void { this._activo = false; }

  /** El médico puede recibir citas en general (activo y con horario). */
  estaDisponibleParaAgendar(): boolean {
    return this._activo && this._horario !== undefined;
  }

  atiendeEl(fecha: FechaCalendario): boolean {
    return this._horario?.atiendeEl(fecha) ?? false;
  }

  franjasDelDia(fecha: FechaCalendario): HoraDelDia[] {
    return this.atiendeEl(fecha) ? this._horario!.franjas() : [];
  }

  /** Devuelve el horario o falla con un mensaje claro si no se ha configurado. */
  horarioObligatorio(): HorarioAtencion {
    if (!this._horario) {
      throw new ReglaNegocioError(`${this.nombres} aún no tiene horario de atención configurado`);
    }
    return this._horario;
  }

  asignarId(id: number): void {
    if (this._id !== undefined) throw new ReglaNegocioError('El médico ya tiene id');
    this._id = id;
  }

  get id(): number | undefined { return this._id; }
  get nombres(): string { return this.datos.nombres; }
  get tipo(): TipoProfesional { return this.datos.tipo; }
  get especialidad(): Especialidad { return this.datos.especialidad; }
  get activo(): boolean { return this._activo; }
  get horario(): HorarioAtencion | undefined { return this._horario; }

  private static validar(datos: DatosMedico): DatosMedico {
    const nombres = datos.nombres.trim().replace(/\s+/g, ' ');
    if (nombres.length < 3) {
      throw new DatoInvalidoError('El nombre del profesional es obligatorio');
    }
    return { ...datos, nombres };
  }
}
