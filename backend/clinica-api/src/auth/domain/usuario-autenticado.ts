import { Rol, ROLES_PERSONAL } from './rol';

/**
 * Quién está haciendo la petición, expresado en términos del dominio.
 *
 * Los casos de uso reciben este objeto, nunca el token JWT crudo. Así no
 * dependen de cómo Keycloak estructura sus claims.
 */
export class UsuarioAutenticado {
  constructor(
    /** Identificador estable del usuario en el proveedor de identidad (claim `sub`). */
    readonly id: string,
    readonly username: string,
    readonly roles: readonly Rol[],
    readonly email?: string,
    readonly nombreCompleto?: string,
  ) {}

  tieneRol(...roles: Rol[]): boolean {
    return roles.some((rol) => this.roles.includes(rol));
  }

  /** true si pertenece al personal (puede gestionar citas de otras personas). */
  esPersonal(): boolean {
    return this.tieneRol(...ROLES_PERSONAL);
  }
}
