import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { Rol, ROLES_PERSONAL } from '../../auth/domain/rol';
import { UsuarioAutenticado } from '../../auth/domain/usuario-autenticado';
import { Roles, UsuarioActual } from '../../auth/infrastructure/decorators';
import { AgendarCitaService } from '../application/agendar-cita.service';
import { ConsultarCitasService } from '../application/consultar-citas.service';
import { DisponibilidadService } from '../application/disponibilidad.service';
import {
  AgendarCitaDto,
  CitaResponseDto,
  franjaDto,
  HistorialQuery,
  MedicoFechaQuery,
  sugerenciaDto,
  SugerenciasQuery,
} from './dto/cita.dto';

@Controller('citas')
export class CitasController {
  constructor(
    private readonly agendar: AgendarCitaService,
    private readonly consultar: ConsultarCitasService,
    private readonly disponibilidad: DisponibilidadService,
  ) {}

  /** RF1: GET /citas?medicoId=1&fecha=2026-11-03 → { total, citas[] } */
  @Get()
  @Roles(...ROLES_PERSONAL)
  agendaDelDia(@Query() q: MedicoFechaQuery) {
    return this.consultar.agendaDelDia(q.medicoId, q.fecha);
  }

  /** RF5: GET /citas/historial?documento=1061234567 */
  @Get('historial')
  @Roles(Rol.MEDICO, Rol.AGENDADOR, Rol.ADMINISTRADOR)
  historial(@Query() q: HistorialQuery) {
    return this.consultar.historialPorDocumento(q.documento);
  }

  @Get('mias')
  @Roles(Rol.PACIENTE)
  misCitas(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.consultar.misCitas(usuario);
  }

  /** RF2: franjas libres de un médico en un día. */
  @Get('disponibilidad')
  async franjas(@Query() q: MedicoFechaQuery) {
    return (await this.disponibilidad.franjasDelDia(q.medicoId, q.fecha)).map(franjaDto);
  }

  /** RF2: "fecha y hora más cercana" para un médico o una especialidad. */
  @Get('sugerencias')
  async sugerencias(@Query() q: SugerenciasQuery) {
    const resultado = await this.disponibilidad.sugerencias(
      { medicoId: q.medicoId, especialidad: q.especialidad },
      q.limite,
    );
    return resultado.map(sugerenciaDto);
  }

  /** RF2 (paciente) y agendamiento manual (personal). */
  @Post()
  async crear(@UsuarioActual() usuario: UsuarioAutenticado, @Body() dto: AgendarCitaDto) {
    return CitaResponseDto.desde(await this.agendar.agendar(usuario, dto));
  }

  @Patch(':id/cancelar')
  @Roles(Rol.PACIENTE, Rol.AGENDADOR, Rol.ADMINISTRADOR)
  async cancelar(@UsuarioActual() usuario: UsuarioAutenticado, @Param('id', ParseIntPipe) id: number) {
    return CitaResponseDto.desde(await this.agendar.cancelar(usuario, id));
  }
}
