/**
 * DOBLES DE PRUEBA (test doubles) compartidos por las pruebas unitarias.
 *
 * Gracias a que los servicios dependen de PUERTOS (interfaces) y no de Prisma,
 * aquí basta con implementar esas interfaces sobre un arreglo en memoria. Son
 * "fakes": funcionan de verdad, pero sin base de datos. Esto es mucho más
 * robusto que simular cada llamada de Prisma con jest.fn().
 */
import { Rol } from '../auth/domain/rol';
import { UsuarioAutenticado } from '../auth/domain/usuario-autenticado';
import { Reloj } from '../shared/application/reloj.port';
import { FechaCalendario } from '../shared/domain/fecha-calendario';
import { HoraDelDia } from '../shared/domain/hora-del-dia';

// ---------------------------------------------------------------------------
// Reloj fijo: "hoy" es lunes 2 de noviembre de 2026 a las 06:00 en Popayán.
// ---------------------------------------------------------------------------
export class RelojFijo implements Reloj {
  constructor(
    public fecha = FechaCalendario.desde('2026-11-02'),
    public hora = HoraDelDia.desde('06:00'),
  ) {}
  hoy() { return this.fecha; }
  horaActual() { return this.hora; }
}

export const f = (s: string) => FechaCalendario.desde(s);
export const h = (s: string) => HoraDelDia.desde(s);

export const usuarioPaciente = (id = 'kc-paciente') => new UsuarioAutenticado(id, 'paciente1', [Rol.PACIENTE]);
export const usuarioAgendador = () => new UsuarioAutenticado('kc-agendador', 'agendador1', [Rol.AGENDADOR]);

