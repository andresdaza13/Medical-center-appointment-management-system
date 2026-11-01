import { ConfiguracionAgendamiento } from '../configuracion/domain/configuracion-agendamiento';
import { ConfiguracionRepository } from '../configuracion/domain/configuracion.repository';

export class ConfiguracionRepositoryEnMemoria implements ConfiguracionRepository {
  constructor(public config = ConfiguracionAgendamiento.porDefecto()) {}
  async obtener() { return this.config; }
  async guardar(c: ConfiguracionAgendamiento) { this.config = c; return c; }
}

