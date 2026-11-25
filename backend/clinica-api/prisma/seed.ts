/**
 * Datos de prueba para desarrollo:  npx prisma db seed
 * Es idempotente: se puede ejecutar varias veces sin duplicar datos.
 */
import { Especialidad, EstadoCita, PrismaClient, TipoProfesional } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.configuracionGlobal.upsert({
    where: { id: 1 },
    create: { id: 1, ventanaSemanas: 4 },
    update: {},
  });

  const profesionales = [
    { nombres: 'Clara Inés Córdoba', tipo: TipoProfesional.MEDICO, especialidad: Especialidad.TERAPIA_NEURAL,
      horario: { diasAtencion: [1, 2, 3, 4, 5], horaInicio: '07:00', horaFin: '11:00', intervaloMinutos: 5 } },
    { nombres: 'José Ignacio García', tipo: TipoProfesional.MEDICO, especialidad: Especialidad.QUIROPRAXIA,
      horario: { diasAtencion: [1, 3, 5], horaInicio: '07:00', horaFin: '12:00', intervaloMinutos: 20 } },
    { nombres: 'Armando Peña', tipo: TipoProfesional.TERAPISTA, especialidad: Especialidad.FISIOTERAPIA,
      horario: { diasAtencion: [2, 4], horaInicio: '08:00', horaFin: '12:00', intervaloMinutos: 30 } },
  ];

  for (const p of profesionales) {
    const existente = await prisma.medico.findFirst({ where: { nombres: p.nombres } });
    if (existente) continue;
    await prisma.medico.create({
      data: {
        nombres: p.nombres,
        tipo: p.tipo,
        especialidad: p.especialidad,
        horario: { create: p.horario },
      },
    });
  }

  const paciente = await prisma.paciente.upsert({
    where: { documento: '1061000001' },
    create: {
      documento: '1061000001',
      nombres: 'Lucy',
      apellidos: 'Chávez',
      celular: '3001234567',
      genero: 'MUJER',
      fechaNacimiento: new Date(Date.UTC(1958, 4, 12)),
    },
    update: {},
  });

  await sembrarCitasHistoricas(paciente.id);

  console.log('Seed completado');
}

/**
 * RF7: citas de oct-2025 a nov-2026 para que el reporte gráfico tenga datos en
 * la demo. Cantidades deterministas (no aleatorias) para que el gráfico salga
 * siempre igual. Se marcan con creadoPor = 'seed' para no duplicarlas.
 */
async function sembrarCitasHistoricas(pacienteId: number) {
  if (await prisma.cita.count({ where: { creadoPor: 'seed' } })) return;

  const medicos = await prisma.medico.findMany({ orderBy: { id: 'asc' } });
  const meses = [
    ...[10, 11, 12].map((mes) => ({ anio: 2025, mes })),
    ...Array.from({ length: 11 }, (_, i) => ({ anio: 2026, mes: i + 1 })),
  ];

  const citas = [];
  for (const [i, medico] of medicos.entries()) {
    for (const [j, { anio, mes }] of meses.entries()) {
      const cantidad = 2 + ((i * 3 + j * 5) % 7); // entre 2 y 8 citas por mes
      for (let dia = 1; dia <= cantidad; dia++) {
        // Una de cada 6 citas, cancelada: el reporte NO debe contarlas.
        const cancelada = (dia + j) % 6 === 0;
        citas.push({
          medicoId: medico.id,
          pacienteId,
          fecha: new Date(Date.UTC(anio, mes - 1, dia)),
          hora: '08:00',
          estado: cancelada ? EstadoCita.CANCELADA : EstadoCita.ATENDIDA,
          activa: cancelada ? null : true,
          motivoCancelacion: cancelada ? 'Cancelada en datos de prueba' : null,
          canceladaEn: cancelada ? new Date(Date.UTC(anio, mes - 1, dia)) : null,
          creadoPor: 'seed',
        });
      }
    }
  }

  await prisma.cita.createMany({ data: citas });
  console.log(`Citas históricas sembradas: ${citas.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());