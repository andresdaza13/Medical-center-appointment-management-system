import { ConfiguracionAgendamiento } from './configuracion-agendamiento';

export interface ConfiguracionRepository {
  /** Devuelve la configuración guardada o la de por defecto si no existe. */
  obtener(): Promise<ConfiguracionAgendamiento>;
  guardar(config: ConfiguracionAgendamiento): Promise<ConfiguracionAgendamiento>;
}

export const CONFIGURACION_REPOSITORY = Symbol('CONFIGURACION_REPOSITORY');
