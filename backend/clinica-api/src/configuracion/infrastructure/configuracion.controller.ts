import { Body, Controller, Get, Put } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import { Rol } from '../../auth/domain/rol';
import { Roles } from '../../auth/infrastructure/decorators';
import { ConfiguracionService } from '../application/configuracion.service';
import { ConfiguracionAgendamiento } from '../domain/configuracion-agendamiento';

export class ActualizarConfiguracionDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ConfiguracionAgendamiento.VENTANA_MAXIMA)
  ventanaSemanas!: number;
}

@Controller('configuracion')
export class ConfiguracionController {
  constructor(private readonly service: ConfiguracionService) {}

  @Get()
  async obtener() {
    const config = await this.service.obtener();
    return { ventanaSemanas: config.ventanaSemanas };
  }

  @Put()
  @Roles(Rol.ADMINISTRADOR)
  async actualizar(@Body() dto: ActualizarConfiguracionDto) {
    const config = await this.service.actualizarVentana(dto.ventanaSemanas);
    return { ventanaSemanas: config.ventanaSemanas };
  }
}
