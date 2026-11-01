import { Body, Controller, Get, Inject, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { Rol, ROLES_PERSONAL } from '../../auth/domain/rol';
import { UsuarioAutenticado } from '../../auth/domain/usuario-autenticado';
import { Roles, UsuarioActual } from '../../auth/infrastructure/decorators';
import { Reloj, RELOJ } from '../../shared/application/reloj.port';
import { PacientesService } from '../application/pacientes.service';
import { PacienteResponseDto, RegistrarPacienteDto, SugerenciaPacienteDto } from './dto/paciente.dto';

/**
 * Adaptador de ENTRADA HTTP. Un controlador delgado: recibe, delega al caso de
 * uso y transforma la respuesta. No contiene lógica (SRP).
 *
 * Importante: las rutas fijas (`me`, `buscar`, `documento/...`) se declaran
 * antes que `:id` para que Express no las confunda con un id.
 */
@Controller('pacientes')
export class PacientesController {
  constructor(
    private readonly service: PacientesService,
    @Inject(RELOJ) private readonly reloj: Reloj,
  ) {}

  // ---- Paciente sobre sí mismo ------------------------------------------

  @Get('me')
  @Roles(Rol.PACIENTE)
  async miPerfil(@UsuarioActual() usuario: UsuarioAutenticado) {
    return PacienteResponseDto.desde(await this.service.obtenerPerfilPropio(usuario), this.reloj);
  }

  @Post('me')
  @Roles(Rol.PACIENTE)
  async registrarMiPerfil(@UsuarioActual() usuario: UsuarioAutenticado, @Body() dto: RegistrarPacienteDto) {
    return PacienteResponseDto.desde(await this.service.registrarPerfilPropio(usuario, dto), this.reloj);
  }

  // ---- Personal de Piedrazul ---------------------------------------------

  /** Autocompletado por cédula: GET /pacientes/buscar?documento=104 */
  @Get('buscar')
  @Roles(...ROLES_PERSONAL)
  async autocompletar(@Query('documento') documento = '') {
    return (await this.service.autocompletar(documento)).map(SugerenciaPacienteDto.desde);
  }

  @Get('documento/:documento')
  @Roles(...ROLES_PERSONAL)
  async porDocumento(@Param('documento') documento: string) {
    return PacienteResponseDto.desde(await this.service.obtenerPorDocumento(documento), this.reloj);
  }

  @Get(':id')
  @Roles(...ROLES_PERSONAL)
  async porId(@Param('id', ParseIntPipe) id: number) {
    return PacienteResponseDto.desde(await this.service.obtenerPorId(id), this.reloj);
  }

  @Post()
  @Roles(Rol.AGENDADOR, Rol.ADMINISTRADOR, Rol.MEDICO)
  async registrar(@Body() dto: RegistrarPacienteDto) {
    return PacienteResponseDto.desde(await this.service.registrar(dto), this.reloj);
  }
}
