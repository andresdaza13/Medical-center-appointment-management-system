-- CreateEnum
CREATE TYPE "TipoProfesional" AS ENUM ('MEDICO', 'TERAPISTA');

-- CreateEnum
CREATE TYPE "Especialidad" AS ENUM ('TERAPIA_NEURAL', 'QUIROPRAXIA', 'FISIOTERAPIA');

-- CreateEnum
CREATE TYPE "Genero" AS ENUM ('HOMBRE', 'MUJER', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoCita" AS ENUM ('AGENDADA', 'ATENDIDA', 'CANCELADA');

-- CreateTable
CREATE TABLE "Paciente" (
    "id" SERIAL NOT NULL,
    "documento" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "celular" TEXT NOT NULL,
    "genero" "Genero" NOT NULL DEFAULT 'OTRO',
    "fechaNacimiento" DATE,
    "email" TEXT,
    "keycloakId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Medico" (
    "id" SERIAL NOT NULL,
    "nombres" TEXT NOT NULL,
    "tipo" "TipoProfesional" NOT NULL,
    "especialidad" "Especialidad" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HorarioAtencion" (
    "id" SERIAL NOT NULL,
    "medicoId" INTEGER NOT NULL,
    "diasAtencion" INTEGER[],
    "horaInicio" TEXT NOT NULL,
    "horaFin" TEXT NOT NULL,
    "intervaloMinutos" INTEGER NOT NULL,

    CONSTRAINT "HorarioAtencion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConfiguracionGlobal" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "ventanaSemanas" INTEGER NOT NULL DEFAULT 4,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracionGlobal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cita" (
    "id" SERIAL NOT NULL,
    "fecha" DATE NOT NULL,
    "hora" TEXT NOT NULL,
    "estado" "EstadoCita" NOT NULL DEFAULT 'AGENDADA',
    "observacion" TEXT,
    "pacienteId" INTEGER NOT NULL,
    "medicoId" INTEGER NOT NULL,
    "creadoPor" TEXT NOT NULL,
    "activa" BOOLEAN DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cita_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_documento_key" ON "Paciente"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "Paciente_keycloakId_key" ON "Paciente"("keycloakId");

-- CreateIndex
CREATE UNIQUE INDEX "HorarioAtencion_medicoId_key" ON "HorarioAtencion"("medicoId");

-- CreateIndex
CREATE INDEX "Cita_medicoId_fecha_idx" ON "Cita"("medicoId", "fecha");

-- CreateIndex
CREATE INDEX "Cita_pacienteId_idx" ON "Cita"("pacienteId");

-- CreateIndex
CREATE UNIQUE INDEX "Cita_medicoId_fecha_hora_activa_key" ON "Cita"("medicoId", "fecha", "hora", "activa");

-- CreateIndex
CREATE UNIQUE INDEX "Cita_pacienteId_medicoId_fecha_activa_key" ON "Cita"("pacienteId", "medicoId", "fecha", "activa");

-- AddForeignKey
ALTER TABLE "HorarioAtencion" ADD CONSTRAINT "HorarioAtencion_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "Medico"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_pacienteId_fkey" FOREIGN KEY ("pacienteId") REFERENCES "Paciente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cita" ADD CONSTRAINT "Cita_medicoId_fkey" FOREIGN KEY ("medicoId") REFERENCES "Medico"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
