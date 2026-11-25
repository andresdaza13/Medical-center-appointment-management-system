import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FechaCalendario } from '../../shared/domain/fecha-calendario';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { EstadoCita } from '../domain/cita';
import { CitaConsultas, CitaDetalle, ConteoMensual } from '../domain/cita-consultas';

/** Columnas exactas que necesitan las pantallas: ni una más (rendimiento y privacidad). */
const SELECCION = {
  id: true,
  fecha: true,
  hora: true,
  estado: true,
  observacion: true,
  creadoPor: true,
  paciente: {
    select: { id: true, documento: true, nombres: true, apellidos: true, celular: true, fechaNacimiento: true },
  },
  medico: { select: { id: true, nombres: true, especialidad: true } },
} satisfies Prisma.CitaSelect;

type FilaDetalle = Prisma.CitaGetPayload<{ select: typeof SELECCION }>;

/** ADAPTADOR Prisma del puerto de LECTURA de citas. */
@Injectable()
export class PrismaCitaConsultas implements CitaConsultas {
  constructor(private readonly prisma: PrismaService) {}

  async delMedicoEnFecha(medicoId: number, fecha: FechaCalendario): Promise<CitaDetalle[]> {
    const filas = await this.prisma.cita.findMany({
      where: { medicoId, fecha: fecha.toDateUtc(), estado: { not: EstadoCita.CANCELADA } },
      select: SELECCION,
      orderBy: { hora: 'asc' }, // "HH:mm" ordena correctamente como texto
    });
    return filas.map(PrismaCitaConsultas.aDetalle);
  }

  async delPaciente(pacienteId: number): Promise<CitaDetalle[]> {
    const filas = await this.prisma.cita.findMany({
      where: { pacienteId },
      select: SELECCION,
      orderBy: [{ fecha: 'desc' }, { hora: 'desc' }],
    });
    return filas.map(PrismaCitaConsultas.aDetalle);
  }

  /**
   * RF7. La agregación la hace PostgreSQL: devuelve como mucho 12 filas por
   * médico, en lugar de traer miles de citas para contarlas en Node.
   *
   * - Filtra por RANGO de fechas (>= 1 ene y < 1 ene del año siguiente) y no
   *   con EXTRACT(YEAR FROM fecha) en el WHERE: comparar la columna tal cual
   *   permite que PostgreSQL use un índice sobre `fecha`; envolverla en una
   *   función lo obliga a revisar todas las filas.
   * - Los valores viajan como PARÁMETROS (${...} en el tagged template de
   *   Prisma), nunca concatenados: eso evita la inyección SQL (OWASP A03).
   * - `::int` porque COUNT devuelve bigint y EXTRACT numeric en PostgreSQL.
   */
  async conteoPorMesYMedico(anio: number): Promise<ConteoMensual[]> {
    const desde = new Date(Date.UTC(anio, 0, 1));
    const hasta = new Date(Date.UTC(anio + 1, 0, 1));
    return this.prisma.$queryRaw<ConteoMensual[]>`
      SELECT c."medicoId" AS "medicoId",
             m."nombres" AS "medicoNombre",
             EXTRACT(MONTH FROM c."fecha")::int AS "mes",
             COUNT(*)::int AS "cantidad"
      FROM "Cita" c
      JOIN "Medico" m ON m."id" = c."medicoId"
      WHERE c."fecha" >= ${desde}
        AND c."fecha" < ${hasta}
        AND c."estado" <> 'CANCELADA'
      GROUP BY c."medicoId", m."nombres", EXTRACT(MONTH FROM c."fecha")
      ORDER BY m."nombres", "mes"`;
  }

  private static aDetalle(f: FilaDetalle): CitaDetalle {
    return {
      id: f.id,
      fecha: FechaCalendario.desdeDateUtc(f.fecha).toString(),
      hora: f.hora,
      estado: f.estado as EstadoCita,
      observacion: f.observacion ?? undefined,
      creadoPor: f.creadoPor,
      paciente: {
        id: f.paciente.id,
        documento: f.paciente.documento,
        nombreCompleto: `${f.paciente.nombres} ${f.paciente.apellidos}`,
        celular: f.paciente.celular,
        fechaNacimiento: f.paciente.fechaNacimiento
          ? FechaCalendario.desdeDateUtc(f.paciente.fechaNacimiento).toString()
          : undefined,
      },
      medico: { id: f.medico.id, nombres: f.medico.nombres, especialidad: f.medico.especialidad },
    };
  }
}