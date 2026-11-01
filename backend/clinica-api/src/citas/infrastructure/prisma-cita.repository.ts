import { Injectable } from '@nestjs/common';
import { Cita as CitaRow } from '@prisma/client';
import { ConflictoError } from '../../shared/domain/errors';
import { FechaCalendario } from '../../shared/domain/fecha-calendario';
import { HoraDelDia } from '../../shared/domain/hora-del-dia';
import { esViolacionUnica, PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { Cita, EstadoCita } from '../domain/cita';
import { CitaRepository, TurnoOcupado } from '../domain/cita.repository';

/** ADAPTADOR Prisma del puerto de ESCRITURA de citas. */
@Injectable()
export class PrismaCitaRepository implements CitaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorId(id: number): Promise<Cita | null> {
    const fila = await this.prisma.cita.findUnique({ where: { id } });
    return fila ? PrismaCitaRepository.aDominio(fila) : null;
  }

  async turnosOcupados(medicoId: number, desde: FechaCalendario, hasta: FechaCalendario): Promise<TurnoOcupado[]> {
    const filas = await this.prisma.cita.findMany({
      where: { medicoId, activa: true, fecha: { gte: desde.toDateUtc(), lte: hasta.toDateUtc() } },
      select: { fecha: true, hora: true },
    });
    return filas.map((f) => ({ fecha: FechaCalendario.desdeDateUtc(f.fecha), hora: HoraDelDia.desde(f.hora) }));
  }

  async pacienteTieneCitaActiva(pacienteId: number, medicoId: number, fecha: FechaCalendario): Promise<boolean> {
    const cantidad = await this.prisma.cita.count({
      where: { pacienteId, medicoId, fecha: fecha.toDateUtc(), activa: true },
    });
    return cantidad > 0;
  }

  async guardar(cita: Cita): Promise<Cita> {
    const datos = {
      medicoId: cita.medicoId,
      pacienteId: cita.pacienteId,
      fecha: cita.fecha.toDateUtc(),
      hora: cita.hora.toString(),
      estado: cita.estado,
      observacion: cita.observacion ?? null,
      creadoPor: cita.creadoPor,
      // true = ocupa el turno; null = lo libera (ver comentario en schema.prisma)
      activa: cita.estaActiva() ? true : null,
    };

    try {
      if (cita.id === undefined) {
        const fila = await this.prisma.cita.create({ data: datos });
        cita.asignarId(fila.id);
      } else {
        await this.prisma.cita.update({ where: { id: cita.id }, data: datos });
      }
      return cita;
    } catch (error) {
      // La restricción UNIQUE ganó la carrera: otra persona tomó el turno
      // entre la validación y el INSERT.
      if (esViolacionUnica(error)) {
        throw new ConflictoError('Ese turno acaba de ser tomado. Por favor elija otra franja.');
      }
      throw error;
    }
  }

  static aDominio(fila: CitaRow): Cita {
    return Cita.reconstituir(
      fila.id,
      {
        medicoId: fila.medicoId,
        pacienteId: fila.pacienteId,
        fecha: FechaCalendario.desdeDateUtc(fila.fecha),
        hora: HoraDelDia.desde(fila.hora),
        observacion: fila.observacion ?? undefined,
        creadoPor: fila.creadoPor,
      },
      fila.estado as EstadoCita,
    );
  }
}
