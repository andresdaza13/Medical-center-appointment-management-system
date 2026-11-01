import { Injectable } from '@nestjs/common';
import { Paciente as PacienteRow } from '@prisma/client';
import { ConflictoError } from '../../shared/domain/errors';
import { FechaCalendario } from '../../shared/domain/fecha-calendario';
import { esViolacionUnica, PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { Genero, Paciente } from '../domain/paciente';
import { PacienteRepository } from '../domain/paciente.repository';

/**
 * ADAPTADOR del puerto PacienteRepository usando Prisma.
 *
 * Responsabilidades (y solo estas):
 *  1. Traducir fila de BD  ⇄  entidad de dominio (métodos aDominio / aFila).
 *  2. Traducir errores de Prisma a errores de dominio (P2002 → ConflictoError).
 * Ninguna regla de negocio vive aquí.
 */
@Injectable()
export class PrismaPacienteRepository implements PacienteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorId(id: number): Promise<Paciente | null> {
    const fila = await this.prisma.paciente.findUnique({ where: { id } });
    return fila ? PrismaPacienteRepository.aDominio(fila) : null;
  }

  async buscarPorDocumento(documento: string): Promise<Paciente | null> {
    const fila = await this.prisma.paciente.findUnique({ where: { documento } });
    return fila ? PrismaPacienteRepository.aDominio(fila) : null;
  }

  async buscarPorKeycloakId(keycloakId: string): Promise<Paciente | null> {
    const fila = await this.prisma.paciente.findUnique({ where: { keycloakId } });
    return fila ? PrismaPacienteRepository.aDominio(fila) : null;
  }

  async buscarPorPrefijoDocumento(prefijo: string, limite: number): Promise<Paciente[]> {
    const filas = await this.prisma.paciente.findMany({
      where: { documento: { startsWith: prefijo } },
      orderBy: { documento: 'asc' },
      take: limite,
    });
    return filas.map(PrismaPacienteRepository.aDominio);
  }

  async guardar(paciente: Paciente): Promise<Paciente> {
    const datos = {
      documento: paciente.documento,
      nombres: paciente.nombres,
      apellidos: paciente.apellidos,
      celular: paciente.celular,
      genero: paciente.genero,
      email: paciente.email ?? null,
      fechaNacimiento: paciente.fechaNacimiento?.toDateUtc() ?? null,
      keycloakId: paciente.keycloakId ?? null,
    };

    try {
      if (paciente.id === undefined) {
        const fila = await this.prisma.paciente.create({ data: datos });
        paciente.asignarId(fila.id);
      } else {
        await this.prisma.paciente.update({ where: { id: paciente.id }, data: datos });
      }
      return paciente;
    } catch (error) {
      if (esViolacionUnica(error)) {
        throw new ConflictoError('Ya existe un paciente con ese documento o cuenta');
      }
      throw error;
    }
  }

  static aDominio(fila: PacienteRow): Paciente {
    return Paciente.reconstituir(
      fila.id,
      {
        documento: fila.documento,
        nombres: fila.nombres,
        apellidos: fila.apellidos,
        celular: fila.celular,
        genero: fila.genero as Genero,
        email: fila.email ?? undefined,
        fechaNacimiento: fila.fechaNacimiento ? FechaCalendario.desdeDateUtc(fila.fechaNacimiento) : undefined,
      },
      fila.keycloakId ?? undefined,
    );
  }
}
