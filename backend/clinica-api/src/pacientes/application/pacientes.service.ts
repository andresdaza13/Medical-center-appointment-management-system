import { Inject, Injectable } from '@nestjs/common';
import { UsuarioAutenticado } from '../../auth/domain/usuario-autenticado';
import { Reloj, RELOJ } from '../../shared/application/reloj.port';
import { ConflictoError, RecursoNoEncontradoError } from '../../shared/domain/errors';
import { FechaCalendario } from '../../shared/domain/fecha-calendario';
import { Genero, Paciente } from '../domain/paciente';
import { PACIENTE_REPOSITORY, PacienteRepository } from '../domain/paciente.repository';

/** Datos de entrada ya validados en forma (el DTO), pero aún no en negocio. */
export interface RegistrarPacienteCmd {
  documento: string;
  nombres: string;
  apellidos: string;
  celular: string;
  genero: Genero;
  fechaNacimiento?: string;
  email?: string;
}

/**
 * Casos de uso de pacientes (capa de APLICACIÓN).
 *
 * La capa de aplicación ORQUESTA: carga entidades del repositorio, les pide
 * que hagan cosas y las guarda. Las reglas en sí están en la entidad.
 */
@Injectable()
export class PacientesService {
  static readonly MIN_CARACTERES_AUTOCOMPLETAR = 3;
  static readonly MAX_SUGERENCIAS = 10;

  constructor(
    @Inject(PACIENTE_REPOSITORY) private readonly repo: PacienteRepository,
    @Inject(RELOJ) private readonly reloj: Reloj,
  ) {}

  /** El personal registra a un paciente (agendamiento manual). */
  async registrar(cmd: RegistrarPacienteCmd): Promise<Paciente> {
    await this.asegurarDocumentoLibre(cmd.documento);
    return this.repo.guardar(this.construir(cmd));
  }

  /**
   * Un usuario recién registrado en Keycloak completa sus datos de paciente
   * (RF2: "el paciente debe tener un registro de usuario para agendar").
   */
  async registrarPerfilPropio(usuario: UsuarioAutenticado, cmd: RegistrarPacienteCmd): Promise<Paciente> {
    if (await this.repo.buscarPorKeycloakId(usuario.id)) {
      throw new ConflictoError('Su cuenta ya tiene un perfil de paciente');
    }

    // Si el personal ya lo había registrado por teléfono, se vincula esa ficha
    // en lugar de duplicarla, siempre que los datos coincidan.
    const existente = await this.repo.buscarPorDocumento(cmd.documento.trim());
    if (existente) {
      if (existente.keycloakId || existente.celular !== cmd.celular.replace(/\s|-/g, '')) {
        throw new ConflictoError('Ya existe un paciente con ese documento. Comuníquese con Piedrazul.');
      }
      existente.vincularCuenta(usuario.id);
      return this.repo.guardar(existente);
    }

    const paciente = this.construir({ ...cmd, email: cmd.email ?? usuario.email });
    paciente.vincularCuenta(usuario.id);
    return this.repo.guardar(paciente);
  }

  async obtenerPerfilPropio(usuario: UsuarioAutenticado): Promise<Paciente> {
    const paciente = await this.repo.buscarPorKeycloakId(usuario.id);
    if (!paciente) throw new RecursoNoEncontradoError('Perfil de paciente', usuario.username);
    return paciente;
  }

  async obtenerPorId(id: number): Promise<Paciente> {
    const paciente = await this.repo.buscarPorId(id);
    if (!paciente) throw new RecursoNoEncontradoError('Paciente', id);
    return paciente;
  }

  async obtenerPorDocumento(documento: string): Promise<Paciente> {
    const paciente = await this.repo.buscarPorDocumento(documento.trim());
    if (!paciente) throw new RecursoNoEncontradoError('Paciente', documento);
    return paciente;
  }

  /** Autocompletado por cédula (mejora del RF2 / soporte del RF5). */
  async autocompletar(prefijo: string): Promise<Paciente[]> {
    const limpio = prefijo.trim();
    if (!/^\d+$/.test(limpio) || limpio.length < PacientesService.MIN_CARACTERES_AUTOCOMPLETAR) {
      return [];
    }
    return this.repo.buscarPorPrefijoDocumento(limpio, PacientesService.MAX_SUGERENCIAS);
  }

  private construir(cmd: RegistrarPacienteCmd): Paciente {
    return Paciente.crear(
      {
        documento: cmd.documento,
        nombres: cmd.nombres,
        apellidos: cmd.apellidos,
        celular: cmd.celular,
        genero: cmd.genero,
        email: cmd.email,
        fechaNacimiento: cmd.fechaNacimiento ? FechaCalendario.desde(cmd.fechaNacimiento) : undefined,
      },
      this.reloj.hoy(),
    );
  }

  private async asegurarDocumentoLibre(documento: string): Promise<void> {
    if (await this.repo.buscarPorDocumento(documento.trim())) {
      throw new ConflictoError(`Ya existe un paciente con documento ${documento}`);
    }
  }
}
