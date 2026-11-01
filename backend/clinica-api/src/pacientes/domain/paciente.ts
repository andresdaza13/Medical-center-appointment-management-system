import { DatoInvalidoError, ReglaNegocioError } from '../../shared/domain/errors';
import { FechaCalendario } from '../../shared/domain/fecha-calendario';

export enum Genero {
  HOMBRE = 'HOMBRE',
  MUJER = 'MUJER',
  OTRO = 'OTRO',
}

export interface DatosPaciente {
  documento: string;
  nombres: string;
  apellidos: string;
  celular: string;
  genero: Genero;
  fechaNacimiento?: FechaCalendario;
  email?: string;
}

/**
 * ENTIDAD de dominio Paciente.
 *
 * Una entidad tiene identidad propia (id) y protege sus invariantes: es
 * imposible tener en memoria un Paciente con celular inválido, porque la única
 * forma de crearlo es `crear()`, que valida.
 *
 * Esto cubre el requisito del proyecto (RF4-iii) de "verificación básica de los
 * datos ingresados, reduciendo información claramente falsa".
 */
export class Paciente {
  private static readonly DOCUMENTO = /^\d{5,12}$/;
  private static readonly CELULAR_CO = /^3\d{9}$/;
  private static readonly EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  private constructor(
    private _id: number | undefined,
    private datos: DatosPaciente,
    private _keycloakId: string | undefined,
  ) {}

  /** Fábrica para pacientes NUEVOS: aplica todas las validaciones. */
  static crear(datos: DatosPaciente, hoy: FechaCalendario): Paciente {
    const limpios: DatosPaciente = {
      ...datos,
      documento: datos.documento.trim(),
      nombres: Paciente.normalizarNombre(datos.nombres),
      apellidos: Paciente.normalizarNombre(datos.apellidos),
      celular: datos.celular.replace(/\s|-/g, ''),
      email: datos.email?.trim().toLowerCase() || undefined,
    };

    if (!Paciente.DOCUMENTO.test(limpios.documento)) {
      throw new DatoInvalidoError('El documento debe tener entre 5 y 12 dígitos');
    }
    if (limpios.nombres.length < 2 || limpios.apellidos.length < 2) {
      throw new DatoInvalidoError('Nombres y apellidos son obligatorios');
    }
    if (!Paciente.CELULAR_CO.test(limpios.celular)) {
      throw new DatoInvalidoError('El celular debe ser un número colombiano de 10 dígitos que inicia en 3');
    }
    if (limpios.email && !Paciente.EMAIL.test(limpios.email)) {
      throw new DatoInvalidoError('El correo electrónico no es válido');
    }
    if (limpios.fechaNacimiento) {
      if (limpios.fechaNacimiento.esPosteriorA(hoy)) {
        throw new DatoInvalidoError('La fecha de nacimiento no puede ser futura');
      }
      if (limpios.fechaNacimiento.anio < hoy.anio - 120) {
        throw new DatoInvalidoError('La fecha de nacimiento no es plausible');
      }
    }
    return new Paciente(undefined, limpios, undefined);
  }

  /** Fábrica para pacientes que ya existen en la BD: no revalida. */
  static reconstituir(id: number, datos: DatosPaciente, keycloakId?: string): Paciente {
    return new Paciente(id, datos, keycloakId);
  }

  /** Vincula el paciente con la cuenta de Keycloak con la que se registró. */
  vincularCuenta(keycloakId: string): void {
    if (this._keycloakId && this._keycloakId !== keycloakId) {
      throw new ReglaNegocioError('Este paciente ya está vinculado a otra cuenta');
    }
    this._keycloakId = keycloakId;
  }

  edadEn(fecha: FechaCalendario): number | undefined {
    return this.datos.fechaNacimiento?.aniosCumplidosEn(fecha);
  }

  /** Asigna el id generado por la BD. Solo lo usa el repositorio. */
  asignarId(id: number): void {
    if (this._id !== undefined) throw new ReglaNegocioError('El paciente ya tiene id');
    this._id = id;
  }

  get id(): number | undefined { return this._id; }
  get keycloakId(): string | undefined { return this._keycloakId; }
  get documento(): string { return this.datos.documento; }
  get nombres(): string { return this.datos.nombres; }
  get apellidos(): string { return this.datos.apellidos; }
  get nombreCompleto(): string { return `${this.datos.nombres} ${this.datos.apellidos}`; }
  get celular(): string { return this.datos.celular; }
  get genero(): Genero { return this.datos.genero; }
  get fechaNacimiento(): FechaCalendario | undefined { return this.datos.fechaNacimiento; }
  get email(): string | undefined { return this.datos.email; }

  private static normalizarNombre(valor: string): string {
    return valor.trim().replace(/\s+/g, ' ');
  }
}
