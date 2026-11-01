import { DatoInvalidoError } from './errors';
import { FechaCalendario } from './fecha-calendario';
import { HoraDelDia } from './hora-del-dia';

describe('FechaCalendario', () => {
  it('crea una fecha válida y la serializa en ISO', () => {
    expect(FechaCalendario.desde('2026-11-03').toString()).toBe('2026-11-03');
  });

  it.each(['2026/11/03', '03-11-2026', '2026-13-01', '2026-02-31', ''])('rechaza "%s"', (valor) => {
    expect(() => FechaCalendario.desde(valor)).toThrow(DatoInvalidoError);
  });

  it('calcula el día ISO de la semana (1 = lunes, 7 = domingo)', () => {
    expect(FechaCalendario.desde('2026-11-02').diaSemana).toBe(1);
    expect(FechaCalendario.desde('2026-11-08').diaSemana).toBe(7);
  });

  it('suma días cruzando meses y años', () => {
    expect(FechaCalendario.desde('2026-12-30').sumarDias(3).toString()).toBe('2027-01-02');
  });

  it('compara fechas', () => {
    const a = FechaCalendario.desde('2026-11-02');
    const b = FechaCalendario.desde('2026-11-03');
    expect(a.esAnteriorA(b)).toBe(true);
    expect(b.esPosteriorA(a)).toBe(true);
    expect(a.equals(FechaCalendario.desde('2026-11-02'))).toBe(true);
  });

  it('ida y vuelta con Date UTC no corre el día (bug clásico de zona horaria)', () => {
    const fecha = FechaCalendario.desde('2026-11-03');
    expect(FechaCalendario.desdeDateUtc(fecha.toDateUtc()).equals(fecha)).toBe(true);
  });

  it('calcula años cumplidos teniendo en cuenta si ya pasó el cumpleaños', () => {
    const nacimiento = FechaCalendario.desde('2000-11-10');
    expect(nacimiento.aniosCumplidosEn(FechaCalendario.desde('2026-11-09'))).toBe(25);
    expect(nacimiento.aniosCumplidosEn(FechaCalendario.desde('2026-11-10'))).toBe(26);
  });
});

describe('HoraDelDia', () => {
  it('convierte entre texto y minutos', () => {
    const hora = HoraDelDia.desde('07:05');
    expect(hora.minutosDesdeMedianoche).toBe(425);
    expect(hora.toString()).toBe('07:05');
  });

  it.each(['7:05', '24:00', '12:60', 'abc'])('rechaza "%s"', (valor) => {
    expect(() => HoraDelDia.desde(valor)).toThrow(DatoInvalidoError);
  });

  it('suma minutos y compara', () => {
    const a = HoraDelDia.desde('07:40');
    const b = a.sumarMinutos(20);
    expect(b.toString()).toBe('08:00');
    expect(a.esAnteriorA(b)).toBe(true);
  });

  it('no permite pasar de la medianoche', () => {
    expect(() => HoraDelDia.desde('23:50').sumarMinutos(20)).toThrow(DatoInvalidoError);
  });
});
