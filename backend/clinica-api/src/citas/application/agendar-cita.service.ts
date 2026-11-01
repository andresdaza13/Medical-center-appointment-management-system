import { Inject, Injectable } from '@nestjs/common';
import { UsuarioAutenticado } from '../../auth/domain/usuario-autenticado';
import { ConfiguracionService } from '../../configuracion/application/configuracion.service';
import { MedicosService } from '../../medicos/application/medicos.service';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { Reloj, RELOJ } from '../../shared/application/reloj.port';
import { AccesoDenegadoError, DatoInvalidoError, RecursoNoEncontradoError } from '../../shared/domain/errors';
import { FechaCalendario } from '../../shared/domain/fecha-calendario';
import { HoraDelDia } from '../../shared/domain/hora-del-dia';
import { Cita } from '../domain/cita';
import { CITA_REPOSITORY, CitaRepository } from '../domain/cita.repository';
import { encadenar, ReglaAgendamiento } from '../domain/reglas/regla-agendamiento';
import {
  DiaAtencionRegla,
  FechaNoPasadaRegla,
  FranjaValidaRegla,
  MedicoDisponibleRegla,
  TurnoLibreRegla,
  UnaCitaPorDiaRegla,
  VentanaAgendamientoRegla,
} from '../domain/reglas/reglas';

export interface AgendarCitaCmd {
  medicoId: number;
  fecha: string;
  hora: string;
  /** Obligatorio cuando agenda el personal; se ignora si agenda el propio paciente. */
  pacienteId?: number;
  observacion?: string;
}

/**
 * Caso de uso: agendar y cancelar citas (RF2 autónomo y agendamiento manual).
 *
 * Fíjate en que este servicio NO contiene ni un `if` de reglas de negocio: solo
 * orquesta (carga datos, ejecuta la cadena de reglas, crea la cita, guarda).
 */
@Injectable()
export class AgendarCitaService {
  private readonly reglas: ReglaAgendamiento;

  constructor(
    @Inject(CITA_REPOSITORY) private readonly citas: CitaRepository,
    private readonly medicos: MedicosService,
    private readonly pacientes: PacientesService,
    private readonly configuracion: ConfiguracionService,
    @Inject(RELOJ) private readonly reloj: Reloj,
  ) {
    // El ORDEN importa: primero las reglas baratas (en memoria), al final las
    // que consultan la base de datos.
    this.reglas = encadenar([
      new MedicoDisponibleRegla(),
      new FechaNoPasadaRegla(),
      new VentanaAgendamientoRegla(),
      new DiaAtencionRegla(),
      new FranjaValidaRegla(),
      new TurnoLibreRegla(citas),
      new UnaCitaPorDiaRegla(citas),
    ]);
  }

  async agendar(usuario: UsuarioAutenticado, cmd: AgendarCitaCmd): Promise<Cita> {
    const esAutonomo = !usuario.esPersonal();
    const pacienteId = await this.resolverPaciente(usuario, cmd, esAutonomo);

    const fecha = FechaCalendario.desde(cmd.fecha);
    const hora = HoraDelDia.desde(cmd.hora);

    await this.reglas.validar({
      medico: await this.medicos.obtener(cmd.medicoId),
      pacienteId,
      fecha,
      hora,
      configuracion: await this.configuracion.obtener(),
      ahora: { hoy: this.reloj.hoy(), horaActual: this.reloj.horaActual() },
      esAutonomo,
    });

    const cita = Cita.agendar({
      medicoId: cmd.medicoId,
      pacienteId,
      fecha,
      hora,
      observacion: cmd.observacion,
      creadoPor: usuario.username,
    });
    return this.citas.guardar(cita);
  }

  async cancelar(usuario: UsuarioAutenticado, citaId: number): Promise<Cita> {
    const cita = await this.citas.buscarPorId(citaId);
    if (!cita) throw new RecursoNoEncontradoError('Cita', citaId);

    // Un paciente solo puede cancelar SUS citas (control de acceso a nivel de
    // objeto; previene el fallo OWASP A01 "Broken Access Control").
    if (!usuario.esPersonal()) {
      const propio = await this.pacientes.obtenerPerfilPropio(usuario);
      if (propio.id !== cita.pacienteId) throw new AccesoDenegadoError('Solo puede cancelar sus propias citas');
    }

    cita.cancelar(this.reloj.hoy());
    return this.citas.guardar(cita);
  }

  private async resolverPaciente(
    usuario: UsuarioAutenticado,
    cmd: AgendarCitaCmd,
    esAutonomo: boolean,
  ): Promise<number> {
    if (esAutonomo) {
      // El paciente NUNCA elige el pacienteId: se toma de su token. Así no
      // puede agendar a nombre de otra persona manipulando la petición.
      const propio = await this.pacientes.obtenerPerfilPropio(usuario);
      return propio.id!;
    }
    if (cmd.pacienteId === undefined) {
      throw new DatoInvalidoError('Debe indicar el paciente para agendar la cita');
    }
    return (await this.pacientes.obtenerPorId(cmd.pacienteId)).id!;
  }
}
