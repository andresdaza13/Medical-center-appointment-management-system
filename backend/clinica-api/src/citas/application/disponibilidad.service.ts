import { Inject, Injectable } from '@nestjs/common';
import { ConfiguracionService } from '../../configuracion/application/configuracion.service';
import { MedicosService } from '../../medicos/application/medicos.service';
import { Especialidad, Medico } from '../../medicos/domain/medico';
import { Reloj, RELOJ } from '../../shared/application/reloj.port';
import { FechaCalendario } from '../../shared/domain/fecha-calendario';
import { CalculadoraDisponibilidad, FranjaLibre } from '../domain/calculadora-disponibilidad';
import { CITA_REPOSITORY, CitaRepository } from '../domain/cita.repository';

export interface Sugerencia {
  medico: Medico;
  franja: FranjaLibre;
}

/**
 * Caso de uso: consultar disponibilidad (RF2).
 *  - franjasDelDia: lo que muestra el asistente al elegir médico y fecha.
 *  - sugerencias:   "la fecha y hora más cercana y adecuada" (requisito del proyecto).
 */
@Injectable()
export class DisponibilidadService {
  static readonly MAX_SUGERENCIAS = 10;

  constructor(
    @Inject(CITA_REPOSITORY) private readonly citas: CitaRepository,
    private readonly medicos: MedicosService,
    private readonly configuracion: ConfiguracionService,
    @Inject(RELOJ) private readonly reloj: Reloj,
  ) {}

  async franjasDelDia(medicoId: number, fecha: string): Promise<FranjaLibre[]> {
    const medico = await this.medicos.obtener(medicoId);
    const dia = FechaCalendario.desde(fecha);
    const ocupados = await this.citas.turnosOcupados(medicoId, dia, dia);
    return CalculadoraDisponibilidad.franjasLibres(medico, dia, dia, ocupados, this.ahora());
  }

  /**
   * Las próximas franjas libres dentro de la ventana de agendamiento, para un
   * médico concreto o para todos los de una especialidad, ordenadas de la más
   * cercana a la más lejana.
   */
  async sugerencias(filtro: { medicoId?: number; especialidad?: Especialidad }, limite = 5): Promise<Sugerencia[]> {
    const cantidad = Math.min(Math.max(limite, 1), DisponibilidadService.MAX_SUGERENCIAS);
    const ahora = this.ahora();
    const hasta = (await this.configuracion.obtener()).ultimaFechaAgendable(ahora.hoy);

    const candidatos = filtro.medicoId
      ? [await this.medicos.obtener(filtro.medicoId)]
      : await this.medicos.listar({ soloActivos: true, especialidad: filtro.especialidad });

    const porMedico = await Promise.all(
      candidatos.map(async (medico) => {
        const ocupados = await this.citas.turnosOcupados(medico.id!, ahora.hoy, hasta);
        return CalculadoraDisponibilidad.franjasLibres(medico, ahora.hoy, hasta, ocupados, ahora, cantidad).map(
          (franja) => ({ medico, franja }),
        );
      }),
    );

    return porMedico
      .flat()
      .sort((a, b) => clave(a.franja).localeCompare(clave(b.franja)))
      .slice(0, cantidad);
  }

  private ahora() {
    return { hoy: this.reloj.hoy(), horaActual: this.reloj.horaActual() };
  }
}

const clave = (f: FranjaLibre) => `${f.fecha}T${f.hora}`;
