import { Inject, Injectable } from '@nestjs/common';
import { UsuarioAutenticado } from '../../auth/domain/usuario-autenticado';
import { MedicosService } from '../../medicos/application/medicos.service';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import { Reloj, RELOJ } from '../../shared/application/reloj.port';
import { FechaCalendario } from '../../shared/domain/fecha-calendario';
import { CITA_CONSULTAS, CitaConsultas, CitaDetalle } from '../domain/cita-consultas';

export interface CitaConEdad extends CitaDetalle {
  paciente: CitaDetalle['paciente'] & { edad?: number };
}

export interface AgendaDelDia {
  medico: { id: number; nombres: string; especialidad: string };
  fecha: string;
  total: number;
  citas: CitaConEdad[];
}

export interface HistorialPaciente {
  paciente: { id: number; documento: string; nombreCompleto: string; celular: string };
  total: number;
  citas: CitaConEdad[];
}

/** Casos de uso de solo lectura sobre citas (RF1, RF5 y "mis citas"). */
@Injectable()
export class ConsultarCitasService {
  constructor(
    @Inject(CITA_CONSULTAS) private readonly consultas: CitaConsultas,
    private readonly medicos: MedicosService,
    private readonly pacientes: PacientesService,
    @Inject(RELOJ) private readonly reloj: Reloj,
  ) {}

  /** RF1: listado y cantidad de citas de un médico en una fecha. */
  async agendaDelDia(medicoId: number, fecha: string): Promise<AgendaDelDia> {
    const medico = await this.medicos.obtener(medicoId);
    const dia = FechaCalendario.desde(fecha);
    const citas = (await this.consultas.delMedicoEnFecha(medicoId, dia)).map((c) => this.conEdad(c));

    return {
      medico: { id: medico.id!, nombres: medico.nombres, especialidad: medico.especialidad },
      fecha: dia.toString(),
      total: citas.length,
      citas,
    };
  }

  /** RF5: historial de citas de un paciente a partir de su cédula. */
  async historialPorDocumento(documento: string): Promise<HistorialPaciente> {
    const paciente = await this.pacientes.obtenerPorDocumento(documento);
    const citas = (await this.consultas.delPaciente(paciente.id!)).map((c) => this.conEdad(c));

    return {
      paciente: {
        id: paciente.id!,
        documento: paciente.documento,
        nombreCompleto: paciente.nombreCompleto,
        celular: paciente.celular,
      },
      total: citas.length,
      citas,
    };
  }

  /** Las citas del paciente autenticado. */
  async misCitas(usuario: UsuarioAutenticado): Promise<CitaConEdad[]> {
    const paciente = await this.pacientes.obtenerPerfilPropio(usuario);
    return (await this.consultas.delPaciente(paciente.id!)).map((c) => this.conEdad(c));
  }

  private conEdad(cita: CitaDetalle): CitaConEdad {
    const nac = cita.paciente.fechaNacimiento;
    if (!nac) return cita;
    const edad = FechaCalendario.desde(nac).aniosCumplidosEn(this.reloj.hoy());
    return { ...cita, paciente: { ...cita.paciente, edad } };
  }
}
