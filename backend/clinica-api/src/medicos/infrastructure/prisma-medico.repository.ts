import { Injectable } from '@nestjs/common';
import { HorarioAtencion as HorarioRow, Medico as MedicoRow } from '@prisma/client';
import { HoraDelDia } from '../../shared/domain/hora-del-dia';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { HorarioAtencion } from '../domain/horario-atencion';
import { Especialidad, Medico, TipoProfesional } from '../domain/medico';
import { FiltroMedicos, MedicoRepository } from '../domain/medico.repository';

type MedicoConHorario = MedicoRow & { horario: HorarioRow | null };

/** ADAPTADOR Prisma del puerto MedicoRepository. */
@Injectable()
export class PrismaMedicoRepository implements MedicoRepository {
  constructor(private readonly prisma: PrismaService) {}

  async buscarPorId(id: number): Promise<Medico | null> {
    const fila = await this.prisma.medico.findUnique({ where: { id }, include: { horario: true } });
    return fila ? PrismaMedicoRepository.aDominio(fila) : null;
  }

  async listar(filtro: FiltroMedicos = {}): Promise<Medico[]> {
    const filas = await this.prisma.medico.findMany({
      where: {
        ...(filtro.soloActivos ? { activo: true } : {}),
        ...(filtro.especialidad ? { especialidad: filtro.especialidad } : {}),
      },
      include: { horario: true },
      orderBy: { nombres: 'asc' },
    });
    return filas.map(PrismaMedicoRepository.aDominio);
  }

  async guardar(medico: Medico): Promise<Medico> {
    const datos = {
      nombres: medico.nombres,
      tipo: medico.tipo,
      especialidad: medico.especialidad,
      activo: medico.activo,
    };
    const h = medico.horario;
    const horario = h
      ? {
          diasAtencion: h.diasAtencion,
          horaInicio: h.horaInicio.toString(),
          horaFin: h.horaFin.toString(),
          intervaloMinutos: h.intervaloMinutos,
        }
      : undefined;

    // Transacción: el médico y su horario se guardan juntos o no se guarda nada.
    await this.prisma.$transaction(async (tx) => {
      if (medico.id === undefined) {
        const fila = await tx.medico.create({ data: datos });
        medico.asignarId(fila.id);
      } else {
        await tx.medico.update({ where: { id: medico.id }, data: datos });
      }
      if (horario) {
        await tx.horarioAtencion.upsert({
          where: { medicoId: medico.id! },
          create: { medicoId: medico.id!, ...horario },
          update: horario,
        });
      }
    });
    return medico;
  }

  static aDominio(fila: MedicoConHorario): Medico {
    const horario = fila.horario
      ? HorarioAtencion.crear({
          diasAtencion: fila.horario.diasAtencion,
          horaInicio: HoraDelDia.desde(fila.horario.horaInicio),
          horaFin: HoraDelDia.desde(fila.horario.horaFin),
          intervaloMinutos: fila.horario.intervaloMinutos,
        })
      : undefined;

    return Medico.reconstituir(
      fila.id,
      {
        nombres: fila.nombres,
        tipo: fila.tipo as TipoProfesional,
        especialidad: fila.especialidad as Especialidad,
      },
      fila.activo,
      horario,
    );
  }
}
