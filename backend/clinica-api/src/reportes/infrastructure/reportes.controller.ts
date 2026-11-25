import { Controller, Get, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';
import { Rol } from '../../auth/domain/rol';
import { Roles } from '../../auth/infrastructure/decorators';
import { ReporteCitasService } from '../application/reporte-citas.service';

export class ReporteCitasQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  anio?: number;
}

/**
 * RF7: el médico/terapista (rol "medico" en Keycloak) y el administrador ven
 * el reporte. Un paciente o un agendador reciben 403 (lo decide el RolesGuard).
 */
@Controller('reportes')
@Roles(Rol.MEDICO, Rol.ADMINISTRADOR)
export class ReportesController {
  constructor(private readonly reportes: ReporteCitasService) {}

  /** GET /reportes/citas-por-mes?anio=2026 */
  @Get('citas-por-mes')
  citasPorMes(@Query() q: ReporteCitasQuery) {
    return this.reportes.citasPorMes(q.anio);
  }
}