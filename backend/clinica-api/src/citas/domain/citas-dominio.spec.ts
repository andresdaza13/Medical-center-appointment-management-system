import { ConfiguracionAgendamiento } from '../../configuracion/domain/configuracion-agendamiento';
import { ConflictoError, ReglaNegocioError } from '../../shared/domain/errors';
import { CitaRepositoryEnMemoria, f, h, unHorario, unMedico } from '../../testing/dobles';
import { CalculadoraDisponibilidad } from './calculadora-disponibilidad';
import { Cita, EstadoCita } from './cita';
import { encadenar, ReglaAgendamiento, SolicitudAgendamiento } from './reglas/regla-agendamiento';
import {
  DiaAtencionRegla,
  FechaNoPasadaRegla,
  FranjaValidaRegla,
  MedicoDisponibleRegla,
  TurnoLibreRegla,
  UnaCitaPorDiaRegla,
  VentanaAgendamientoRegla,
} from './reglas/reglas';

// "Ahora" = lunes 2 de noviembre de 2026, 06:00
const AHORA = { hoy: f('2026-11-02'), horaActual: h('06:00') };

describe('Cita (ciclo de vida)', () => {
  const nueva = () =>
    Cita.agendar({ medicoId: 1, pacienteId: 10, fecha: f('2026-11-04'), hora: h('07:00'), creadoPor: 'agendador1' });

  it('nace AGENDADA y activa', () => {
    const c = nueva();
    expect(c.estado).toBe(EstadoCita.AGENDADA);
    expect(c.estaActiva()).toBe(true);
  });

  it('al cancelarse deja de estar activa (libera el turno)', () => {
    const c = nueva();
    c.cancelar(AHORA.hoy);
    expect(c.estado).toBe(EstadoCita.CANCELADA);
    expect(c.estaActiva()).toBe(false);
  });

  it('no se puede cancelar dos veces ni cancelar una cita atendida', () => {
    const cancelada = nueva();
    cancelada.cancelar(AHORA.hoy);
    expect(() => cancelada.cancelar(AHORA.hoy)).toThrow(ReglaNegocioError);

    const atendida = nueva();
    atendida.atender();
    expect(() => atendida.cancelar(AHORA.hoy)).toThrow(ReglaNegocioError);
  });

  it('no se puede cancelar una cita de una fecha pasada', () => {
    expect(() => nueva().cancelar(f('2026-11-05'))).toThrow(ReglaNegocioError);
  });

  it('rechaza observaciones demasiado largas', () => {
    expect(() =>
      Cita.agendar({ medicoId: 1, pacienteId: 1, fecha: f('2026-11-04'), hora: h('07:00'), creadoPor: 'x', observacion: 'a'.repeat(501) }),
    ).toThrow(ReglaNegocioError);
  });
});

describe('CalculadoraDisponibilidad', () => {
  const medico = unMedico(1, { horario: unHorario({ dias: [1, 3], inicio: '07:00', fin: '08:00', intervalo: 20 }) });

  it('devuelve las franjas libres de los días que atiende, en orden', () => {
    const libres = CalculadoraDisponibilidad.franjasLibres(medico, f('2026-11-02'), f('2026-11-04'), [], AHORA);
    expect(libres.map((l) => `${l.fecha} ${l.hora}`)).toEqual([
      '2026-11-02 07:00', '2026-11-02 07:20', '2026-11-02 07:40',
      '2026-11-04 07:00', '2026-11-04 07:20', '2026-11-04 07:40',
    ]);
  });

  it('excluye los turnos ocupados', () => {
    const ocupados = [{ fecha: f('2026-11-02'), hora: h('07:20') }];
    const libres = CalculadoraDisponibilidad.franjasLibres(medico, f('2026-11-02'), f('2026-11-02'), ocupados, AHORA);
    expect(libres.map((l) => String(l.hora))).toEqual(['07:00', '07:40']);
  });

  it('excluye franjas de hoy que ya pasaron', () => {
    const ahora = { hoy: f('2026-11-02'), horaActual: h('07:20') };
    const libres = CalculadoraDisponibilidad.franjasLibres(medico, f('2026-11-02'), f('2026-11-02'), [], ahora);
    expect(libres.map((l) => String(l.hora))).toEqual(['07:40']);
  });

  it('respeta el límite de resultados', () => {
    expect(CalculadoraDisponibilidad.franjasLibres(medico, f('2026-11-02'), f('2026-11-30'), [], AHORA, 2)).toHaveLength(2);
  });

  it('no ofrece franjas de un médico inactivo', () => {
    const inactivo = unMedico(2, { activo: false });
    expect(CalculadoraDisponibilidad.franjasLibres(inactivo, f('2026-11-02'), f('2026-11-30'), [], AHORA)).toEqual([]);
  });
});

describe('Cadena de reglas de agendamiento', () => {
  const solicitud = (cambios: Partial<SolicitudAgendamiento> = {}): SolicitudAgendamiento => ({
    medico: unMedico(1), // lunes, miércoles, viernes 07:00–08:00 cada 20 min
    pacienteId: 10,
    fecha: f('2026-11-04'), // miércoles
    hora: h('07:20'),
    configuracion: ConfiguracionAgendamiento.crear(2),
    ahora: AHORA,
    esAutonomo: true,
    ...cambios,
  });

  describe('cada regla por separado', () => {
    it('MedicoDisponibleRegla: rechaza médico inactivo o sin horario', async () => {
      const regla = new MedicoDisponibleRegla();
      await expect(regla.validar(solicitud({ medico: unMedico(1, { activo: false }) }))).rejects.toThrow(ReglaNegocioError);
      await expect(regla.validar(solicitud({ medico: unMedico(1, { horario: null }) }))).rejects.toThrow(ReglaNegocioError);
      await expect(regla.validar(solicitud())).resolves.toBeUndefined();
    });

    it('FechaNoPasadaRegla: rechaza ayer y una hora de hoy que ya pasó', async () => {
      const regla = new FechaNoPasadaRegla();
      await expect(regla.validar(solicitud({ fecha: f('2026-11-01') }))).rejects.toThrow(ReglaNegocioError);
      await expect(
        regla.validar(solicitud({ fecha: f('2026-11-02'), hora: h('07:00'), ahora: { hoy: f('2026-11-02'), horaActual: h('07:00') } })),
      ).rejects.toThrow(ReglaNegocioError);
      await expect(regla.validar(solicitud({ fecha: f('2026-11-02'), hora: h('07:00') }))).resolves.toBeUndefined();
    });

    it('VentanaAgendamientoRegla: limita al paciente pero no al personal', async () => {
      const regla = new VentanaAgendamientoRegla();
      const lejana = f('2026-11-20'); // más de 2 semanas
      await expect(regla.validar(solicitud({ fecha: lejana }))).rejects.toThrow(/2 semanas/);
      await expect(regla.validar(solicitud({ fecha: lejana, esAutonomo: false }))).resolves.toBeUndefined();
    });

    it('DiaAtencionRegla: rechaza un día que el médico no atiende', async () => {
      await expect(new DiaAtencionRegla().validar(solicitud({ fecha: f('2026-11-03') }))).rejects.toThrow(/martes/);
    });

    it('FranjaValidaRegla: rechaza horas que no son inicio de franja', async () => {
      const regla = new FranjaValidaRegla();
      await expect(regla.validar(solicitud({ hora: h('07:10') }))).rejects.toThrow(ReglaNegocioError);
      await expect(regla.validar(solicitud({ hora: h('08:00') }))).rejects.toThrow(ReglaNegocioError);
    });

    it('TurnoLibreRegla: rechaza un turno con cita activa, pero no uno cancelado', async () => {
      const repo = new CitaRepositoryEnMemoria();
      const regla = new TurnoLibreRegla(repo);
      repo.sembrar(1, 99, '2026-11-04', '07:20', EstadoCita.CANCELADA);
      await expect(regla.validar(solicitud())).resolves.toBeUndefined();
      repo.sembrar(1, 98, '2026-11-04', '07:20');
      await expect(regla.validar(solicitud())).rejects.toThrow(ConflictoError);
    });

    it('UnaCitaPorDiaRegla: un paciente no repite médico el mismo día', async () => {
      const repo = new CitaRepositoryEnMemoria();
      repo.sembrar(1, 10, '2026-11-04', '07:00');
      await expect(new UnaCitaPorDiaRegla(repo).validar(solicitud())).rejects.toThrow(ConflictoError);
    });
  });

  describe('encadenamiento (Chain of Responsibility)', () => {
    class Espia extends ReglaAgendamiento {
      constructor(private readonly nombre: string, private readonly log: string[], private readonly falla = false) {
        super();
      }
      protected verificar() {
        this.log.push(this.nombre);
        if (this.falla) throw new ReglaNegocioError(this.nombre);
      }
    }

    it('recorre todos los eslabones en orden', async () => {
      const log: string[] = [];
      await encadenar([new Espia('a', log), new Espia('b', log), new Espia('c', log)]).validar(solicitud());
      expect(log).toEqual(['a', 'b', 'c']);
    });

    it('se detiene en el primer eslabón que falla', async () => {
      const log: string[] = [];
      const cadena = encadenar([new Espia('a', log), new Espia('b', log, true), new Espia('c', log)]);
      await expect(cadena.validar(solicitud())).rejects.toThrow('b');
      expect(log).toEqual(['a', 'b']);
    });

    it('no permite una cadena vacía', () => {
      expect(() => encadenar([])).toThrow();
    });
  });
});
