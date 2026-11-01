import { DatoInvalidoError } from '../shared/domain/errors';
import { f } from '../testing/base';
import { ConfiguracionRepositoryEnMemoria } from '../testing/configuracion.dobles';
import { ConfiguracionService } from './application/configuracion.service';
import { ConfiguracionAgendamiento } from './domain/configuracion-agendamiento';

describe('ConfiguracionAgendamiento', () => {
  it('calcula la última fecha agendable a partir de hoy', () => {
    const config = ConfiguracionAgendamiento.crear(2);
    expect(config.ultimaFechaAgendable(f('2026-11-02')).toString()).toBe('2026-11-16');
  });

  it.each([0, -1, 1.5, 27])('rechaza una ventana de %p semanas', (semanas) => {
    expect(() => ConfiguracionAgendamiento.crear(semanas)).toThrow(DatoInvalidoError);
  });

  it('tiene un valor por defecto de 4 semanas', () => {
    expect(ConfiguracionAgendamiento.porDefecto().ventanaSemanas).toBe(4);
  });
});

describe('ConfiguracionService', () => {
  it('obtiene y actualiza la ventana', async () => {
    const service = new ConfiguracionService(new ConfiguracionRepositoryEnMemoria());
    expect((await service.obtener()).ventanaSemanas).toBe(4);
    await service.actualizarVentana(8);
    expect((await service.obtener()).ventanaSemanas).toBe(8);
  });
});
