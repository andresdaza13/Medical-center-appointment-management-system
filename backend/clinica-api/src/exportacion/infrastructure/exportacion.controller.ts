import { Controller, Get, Query, Res, StreamableFile } from '@nestjs/common';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Response } from 'express';
import { Rol } from '../../auth/domain/rol';
import { Roles } from '../../auth/infrastructure/decorators';
import { MedicoFechaQuery } from '../../citas/infrastructure/dto/cita.dto';
import { ExportarAgendaService } from '../application/exportar-agenda.service';

export class ExportarAgendaQuery extends MedicoFechaQuery {
  @IsOptional()
  @IsString()
  @MaxLength(10)
  formato?: string;
}

@Controller('exportaciones')
@Roles(Rol.MEDICO, Rol.AGENDADOR, Rol.ADMINISTRADOR)
export class ExportacionController {
  constructor(private readonly service: ExportarAgendaService) {}

  @Get('formatos')
  formatos() {
    return this.service.formatosDisponibles();
  }

  /** RF4: GET /exportaciones/agenda?medicoId=1&fecha=2026-11-03&formato=csv */
  @Get('agenda')
  async agenda(@Query() q: ExportarAgendaQuery, @Res({ passthrough: true }) res: Response) {
    const archivo = await this.service.exportar(q.medicoId, q.fecha, q.formato ?? 'csv');

    res.set({
      'Content-Type': archivo.mimeType,
      'Content-Disposition': `attachment; filename="${archivo.nombreArchivo}"`,
      'Cache-Control': 'no-store', // datos personales: que no queden en cachés
    });
    return new StreamableFile(archivo.contenido);
  }
}
