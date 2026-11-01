import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Put, Query } from '@nestjs/common';
import { Rol } from '../../auth/domain/rol';
import { UsuarioAutenticado } from '../../auth/domain/usuario-autenticado';
import { Roles, UsuarioActual } from '../../auth/infrastructure/decorators';
import { MedicosService } from '../application/medicos.service';
import {
  CambiarEstadoMedicoDto,
  ConfigurarHorarioDto,
  FiltroMedicosQuery,
  GuardarMedicoDto,
  MedicoResponseDto,
} from './dto/medico.dto';

@Controller('medicos')
export class MedicosController {
  constructor(private readonly service: MedicosService) {}

  /** Cualquier usuario autenticado. Los pacientes solo ven profesionales activos. */
  @Get()
  async listar(@Query() filtro: FiltroMedicosQuery, @UsuarioActual() usuario: UsuarioAutenticado) {
    const medicos = await this.service.listar({
      especialidad: filtro.especialidad,
      soloActivos: !usuario.esPersonal(),
    });
    return medicos.map(MedicoResponseDto.desde);
  }

  @Get(':id')
  async obtener(@Param('id', ParseIntPipe) id: number) {
    return MedicoResponseDto.desde(await this.service.obtener(id));
  }

  @Post()
  @Roles(Rol.ADMINISTRADOR)
  async registrar(@Body() dto: GuardarMedicoDto) {
    return MedicoResponseDto.desde(await this.service.registrar(dto));
  }

  @Put(':id')
  @Roles(Rol.ADMINISTRADOR)
  async actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: GuardarMedicoDto) {
    return MedicoResponseDto.desde(await this.service.actualizar(id, dto));
  }

  @Patch(':id/estado')
  @Roles(Rol.ADMINISTRADOR)
  async cambiarEstado(@Param('id', ParseIntPipe) id: number, @Body() dto: CambiarEstadoMedicoDto) {
    return MedicoResponseDto.desde(await this.service.cambiarEstado(id, dto.activo));
  }

  /** RF3: días, franja horaria e intervalo entre citas del profesional. */
  @Put(':id/horario')
  @Roles(Rol.ADMINISTRADOR)
  async configurarHorario(@Param('id', ParseIntPipe) id: number, @Body() dto: ConfigurarHorarioDto) {
    return MedicoResponseDto.desde(await this.service.configurarHorario(id, dto));
  }
}
