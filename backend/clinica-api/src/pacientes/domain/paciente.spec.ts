import { DatoInvalidoError, ReglaNegocioError } from '../../shared/domain/errors';
import { f } from '../../testing/base';
import { DatosPaciente, Genero, Paciente } from './paciente';

const HOY = f('2026-11-02');

const datosValidos = (cambios: Partial<DatosPaciente> = {}): DatosPaciente => ({
  documento: '1061000001',
  nombres: '  María   Rosario ',
  apellidos: 'Bravo',
  celular: '300 123-4567',
  genero: Genero.MUJER,
  email: ' Maria@Correo.COM ',
  fechaNacimiento: f('1980-05-20'),
  ...cambios,
});

describe('Paciente', () => {
  it('normaliza los datos al crearse', () => {
    const p = Paciente.crear(datosValidos(), HOY);
    expect(p.nombres).toBe('María Rosario');
    expect(p.celular).toBe('3001234567');
    expect(p.email).toBe('maria@correo.com');
    expect(p.nombreCompleto).toBe('María Rosario Bravo');
    expect(p.id).toBeUndefined();
  });

  it.each([
    ['documento con letras', { documento: '10A2345' }],
    ['documento muy corto', { documento: '123' }],
    ['celular que no es colombiano', { celular: '6012345678' }],
    ['correo inválido', { email: 'no-es-correo' }],
    ['nombre vacío', { nombres: ' ' }],
    ['nacimiento futuro', { fechaNacimiento: f('2030-01-01') }],
    ['nacimiento imposible', { fechaNacimiento: f('1850-01-01') }],
  ])('rechaza %s', (_caso, cambios) => {
    expect(() => Paciente.crear(datosValidos(cambios as Partial<DatosPaciente>), HOY)).toThrow(DatoInvalidoError);
  });

  it('calcula la edad en una fecha', () => {
    const p = Paciente.crear(datosValidos(), HOY);
    expect(p.edadEn(HOY)).toBe(46);
  });

  it('se vincula una sola vez a una cuenta de Keycloak', () => {
    const p = Paciente.crear(datosValidos(), HOY);
    p.vincularCuenta('kc-1');
    expect(() => p.vincularCuenta('kc-1')).not.toThrow();
    expect(() => p.vincularCuenta('kc-2')).toThrow(ReglaNegocioError);
  });
});
