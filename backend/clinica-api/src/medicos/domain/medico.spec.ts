import { DatoInvalidoError, ReglaNegocioError } from '../../shared/domain/errors';
import { f, h } from '../../testing/base';
import { unHorario, unMedico } from '../../testing/medicos.dobles';
import { HorarioAtencion } from './horario-atencion';
import { Especialidad, Medico, TipoProfesional } from './medico';

describe('HorarioAtencion', () => {
  it('genera las franjas que caben completas en el horario', () => {
    const horario = unHorario({ inicio: '07:00', fin: '08:00', intervalo: 20 });
    expect(horario.franjas().map(String)).toEqual(['07:00', '07:20', '07:40']);
  });

  it('no genera una franja que terminaría después de la hora de fin', () => {
    const horario = unHorario({ inicio: '07:00', fin: '07:50', intervalo: 20 });
    expect(horario.franjas().map(String)).toEqual(['07:00', '07:20']);
  });

  it('sabe qué días atiende', () => {
    const horario = unHorario({ dias: [1, 3] });
    expect(horario.atiendeEl(f('2026-11-02'))).toBe(true); // lunes
    expect(horario.atiendeEl(f('2026-11-03'))).toBe(false); // martes
  });

  it('valida si una hora es inicio de franja', () => {
    const horario = unHorario({ inicio: '07:00', fin: '08:00', intervalo: 20 });
    expect(horario.incluyeFranja(h('07:20'))).toBe(true);
    expect(horario.incluyeFranja(h('07:10'))).toBe(false);
  });

  it('elimina días repetidos y los ordena', () => {
    expect(unHorario({ dias: [5, 1, 5] }).diasAtencion).toEqual([1, 5]);
  });

  it.each([
    ['sin días', { dias: [] }],
    ['día fuera de rango', { dias: [0, 8] }],
    ['inicio después del fin', { inicio: '10:00', fin: '09:00' }],
    ['intervalo muy pequeño', { intervalo: 1 }],
    ['intervalo más largo que la franja', { inicio: '07:00', fin: '07:30', intervalo: 60 }],
  ])('rechaza %s', (_caso, datos) => {
    expect(() => unHorario(datos)).toThrow(DatoInvalidoError);
  });
});

describe('Medico', () => {
  it('se crea activo y sin horario', () => {
    const m = Medico.crear({ nombres: ' Ibis  González ', tipo: TipoProfesional.MEDICO, especialidad: Especialidad.QUIROPRAXIA });
    expect(m.activo).toBe(true);
    expect(m.nombres).toBe('Ibis González');
    expect(m.estaDisponibleParaAgendar()).toBe(false);
  });

  it('rechaza un nombre vacío', () => {
    expect(() => Medico.crear({ nombres: ' ', tipo: TipoProfesional.MEDICO, especialidad: Especialidad.QUIROPRAXIA })).toThrow(
      DatoInvalidoError,
    );
  });

  it('solo está disponible si está activo y tiene horario', () => {
    expect(unMedico(1).estaDisponibleParaAgendar()).toBe(true);
    expect(unMedico(1, { activo: false }).estaDisponibleParaAgendar()).toBe(false);
    expect(unMedico(1, { horario: null }).estaDisponibleParaAgendar()).toBe(false);
  });

  it('devuelve franjas solo los días que atiende', () => {
    const m = unMedico(1, { horario: unHorario({ dias: [1] }) });
    expect(m.franjasDelDia(f('2026-11-02'))).toHaveLength(3);
    expect(m.franjasDelDia(f('2026-11-03'))).toHaveLength(0);
  });

  it('horarioObligatorio lanza error si no está configurado', () => {
    expect(() => unMedico(1, { horario: null }).horarioObligatorio()).toThrow(ReglaNegocioError);
  });

  it('puede reemplazar su horario', () => {
    const m = unMedico(1);
    const nuevo = HorarioAtencion.crear({ diasAtencion: [2], horaInicio: h('09:00'), horaFin: h('10:00'), intervaloMinutos: 30 });
    m.configurarHorario(nuevo);
    expect(m.horario).toBe(nuevo);
  });
});
