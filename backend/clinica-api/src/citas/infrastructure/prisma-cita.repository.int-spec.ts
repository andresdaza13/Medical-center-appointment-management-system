/**
 * PRUEBA DE INTEGRACIÓN (RNF3): el adaptador Prisma contra un PostgreSQL real.
 *
 * Las pruebas unitarias usan repositorios en memoria y por eso NO pueden
 * comprobar lo que garantiza la base de datos: las restricciones UNIQUE, el
 * mapeo de columnas y el manejo de fechas. Estas sí.
 *
 * Requiere la base "piedrazul_test" (ver test/integracion/entorno.js).
 * Ejecutar con:  npm run test:int
 */
import { ConflictoError } from '../../shared/domain/errors';
import { FechaCalendario } from '../../shared/domain/fecha-calendario';
import { HoraDelDia } from '../../shared/domain/hora-del-dia';
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service';
import { Cita, EstadoCita } from '../domain/cita';
import { PrismaCitaRepository } from './prisma-cita.repository';

const f = (s: string) => FechaCalendario.desde(s);
const h = (s: string) => HoraDelDia.desde(s);

describe('PrismaCitaRepository contra PostgreSQL (integración)', () => {
  const prisma = new PrismaService();
  const repo = new PrismaCitaRepository(prisma);
  let medicoId: number;
  let pacienteA: number;
  let pacienteB: number;

  const nuevaCita = (pacienteId: number, fecha = '2026-12-07', hora = '07:00') =>
    Cita.agendar({ medicoId, pacienteId, fecha: f(fecha), hora: h(hora), creadoPor: 'prueba-integracion' });

  beforeAll(() => prisma.$connect());
  afterAll(() => prisma.$disconnect());

  // Cada prueba empieza con la base vacía: así no dependen unas de otras.
  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE "Cita", "HorarioAtencion", "Medico", "Paciente" RESTART IDENTITY CASCADE',
    );
    medicoId = (await prisma.medico.create({
      data: { nombres: 'Médica de prueba', tipo: 'MEDICO', especialidad: 'TERAPIA_NEURAL' },
    })).id;
    pacienteA = (await prisma.paciente.create({
      data: { documento: '1000000001', nombres: 'Ana', apellidos: 'Prueba', celular: '3000000001' },
    })).id;
    pacienteB = (await prisma.paciente.create({
      data: { documento: '1000000002', nombres: 'Beto', apellidos: 'Prueba', celular: '3000000002' },
    })).id;
  });

  it('guarda una cita y la recupera igual (sin correr el día por la zona horaria)', async () => {
    const guardada = await repo.guardar(nuevaCita(pacienteA, '2026-12-31', '07:40'));

    const leida = await repo.buscarPorId(guardada.id!);

    expect(leida).not.toBeNull();
    expect(leida!.fecha.toString()).toBe('2026-12-31');
    expect(leida!.hora.toString()).toBe('07:40');
    expect(leida!.estado).toBe(EstadoCita.AGENDADA);
    expect(leida!.creadoPor).toBe('prueba-integracion');
  });

  it('ADR-04: la base rechaza dos citas activas en el mismo turno', async () => {
    await repo.guardar(nuevaCita(pacienteA));

    await expect(repo.guardar(nuevaCita(pacienteB))).rejects.toThrow(ConflictoError);
  });

  it('ADR-04: si dos pacientes reservan el mismo turno A LA VEZ, solo uno lo obtiene', async () => {
    const resultados = await Promise.allSettled([
      repo.guardar(nuevaCita(pacienteA)),
      repo.guardar(nuevaCita(pacienteB)),
    ]);

    const exitos = resultados.filter((r) => r.status === 'fulfilled');
    const fallos = resultados.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    expect(exitos).toHaveLength(1);
    expect(fallos).toHaveLength(1);
    expect(fallos[0].reason).toBeInstanceOf(ConflictoError);
    expect(await prisma.cita.count()).toBe(1);
  });

  it('RF6: cancelar guarda la justificación y libera el turno para otro paciente', async () => {
    const cita = await repo.guardar(nuevaCita(pacienteA));
    cita.cancelar({ hoy: f('2026-12-01'), justificacion: 'Viaje de trabajo imprevisto', esAutonoma: true });
    await repo.guardar(cita);

    const leida = await repo.buscarPorId(cita.id!);
    expect(leida!.estado).toBe(EstadoCita.CANCELADA);
    expect(leida!.motivoCancelacion).toBe('Viaje de trabajo imprevisto');
    expect(leida!.fechaCancelacion?.toString()).toBe('2026-12-01');

    // El turno quedó libre: otro paciente puede tomarlo.
    await expect(repo.guardar(nuevaCita(pacienteB))).resolves.toBeDefined();
  });

  it('las consultas de disponibilidad ignoran las citas canceladas', async () => {
    const cancelada = await repo.guardar(nuevaCita(pacienteA, '2026-12-07', '07:00'));
    cancelada.cancelar({ hoy: f('2026-12-01'), justificacion: 'Ya no necesito la cita', esAutonoma: true });
    await repo.guardar(cancelada);
    await repo.guardar(nuevaCita(pacienteB, '2026-12-07', '07:20'));

    const ocupados = await repo.turnosOcupados(medicoId, f('2026-12-07'), f('2026-12-07'));

    expect(ocupados.map((t) => t.hora.toString())).toEqual(['07:20']);
    expect(await repo.pacienteTieneCitaActiva(pacienteA, medicoId, f('2026-12-07'))).toBe(false);
    expect(await repo.pacienteTieneCitaActiva(pacienteB, medicoId, f('2026-12-07'))).toBe(true);
  });
});