import { Inject, Injectable } from '@nestjs/common';
import { RecursoNoEncontradoError } from '../../shared/domain/errors';
import { HoraDelDia } from '../../shared/domain/hora-del-dia';
import { HorarioAtencion } from '../domain/horario-atencion';
import { DatosMedico, Medico } from '../domain/medico';
import { FiltroMedicos, MEDICO_REPOSITORY, MedicoRepository } from '../domain/medico.repository';

export interface ConfigurarHorarioCmd {
  diasAtencion: number[];
  horaInicio: string;
  horaFin: string;
  intervaloMinutos: number;
}

/** Casos de uso de médicos/terapistas y de su horario (RF3). */
@Injectable()
export class MedicosService {
  constructor(@Inject(MEDICO_REPOSITORY) private readonly repo: MedicoRepository) {}

  listar(filtro?: FiltroMedicos): Promise<Medico[]> {
    return this.repo.listar(filtro);
  }

  async obtener(id: number): Promise<Medico> {
    const medico = await this.repo.buscarPorId(id);
    if (!medico) throw new RecursoNoEncontradoError('Médico/terapista', id);
    return medico;
  }

  registrar(datos: DatosMedico): Promise<Medico> {
    return this.repo.guardar(Medico.crear(datos));
  }

  async actualizar(id: number, datos: DatosMedico): Promise<Medico> {
    const medico = await this.obtener(id);
    medico.actualizarDatos(datos);
    return this.repo.guardar(medico);
  }

  /**
   * Se desactiva en lugar de borrar: las citas históricas siguen apuntando al
   * profesional (la versión anterior borraba sus citas en cascada, perdiendo
   * el historial clínico).
   */
  async cambiarEstado(id: number, activo: boolean): Promise<Medico> {
    const medico = await this.obtener(id);
    if (activo) medico.activar();
    else medico.desactivar();
    return this.repo.guardar(medico);
  }

  async configurarHorario(id: number, cmd: ConfigurarHorarioCmd): Promise<Medico> {
    const medico = await this.obtener(id);
    medico.configurarHorario(
      HorarioAtencion.crear({
        diasAtencion: cmd.diasAtencion,
        horaInicio: HoraDelDia.desde(cmd.horaInicio),
        horaFin: HoraDelDia.desde(cmd.horaFin),
        intervaloMinutos: cmd.intervaloMinutos,
      }),
    );
    return this.repo.guardar(medico);
  }
}
