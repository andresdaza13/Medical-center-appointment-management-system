/**
 * Datos de prueba para desarrollo:  npx prisma db seed
 * Es idempotente: se puede ejecutar varias veces sin duplicar datos.
 */
import { Especialidad, PrismaClient, TipoProfesional } from '@prisma/client';

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

  await prisma.paciente.upsert({
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

  console.log('Seed completado');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
