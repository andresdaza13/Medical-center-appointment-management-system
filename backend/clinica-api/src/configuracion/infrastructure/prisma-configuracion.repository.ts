import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { ConfiguracionAgendamiento } from '../domain/configuracion-agendamiento';
import { ConfiguracionRepository } from '../domain/configuracion.repository';

const FILA_UNICA = 1;

@Injectable()
export class PrismaConfiguracionRepository implements ConfiguracionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async obtener(): Promise<ConfiguracionAgendamiento> {
    const fila = await this.prisma.configuracionGlobal.findUnique({ where: { id: FILA_UNICA } });
    return fila ? ConfiguracionAgendamiento.crear(fila.ventanaSemanas) : ConfiguracionAgendamiento.porDefecto();
  }

  async guardar(config: ConfiguracionAgendamiento): Promise<ConfiguracionAgendamiento> {
    await this.prisma.configuracionGlobal.upsert({
      where: { id: FILA_UNICA },
      create: { id: FILA_UNICA, ventanaSemanas: config.ventanaSemanas },
      update: { ventanaSemanas: config.ventanaSemanas },
    });
    return config;
  }
}
