import { Inject, Injectable } from '@nestjs/common';
import { ConfiguracionAgendamiento } from '../domain/configuracion-agendamiento';
import { CONFIGURACION_REPOSITORY, ConfiguracionRepository } from '../domain/configuracion.repository';

@Injectable()
export class ConfiguracionService {
  constructor(@Inject(CONFIGURACION_REPOSITORY) private readonly repo: ConfiguracionRepository) {}

  obtener(): Promise<ConfiguracionAgendamiento> {
    return this.repo.obtener();
  }

  actualizarVentana(ventanaSemanas: number): Promise<ConfiguracionAgendamiento> {
    return this.repo.guardar(ConfiguracionAgendamiento.crear(ventanaSemanas));
  }
}
