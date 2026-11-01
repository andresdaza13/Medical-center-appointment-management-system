/**
 * Roles del dominio de Piedrazul.
 *
 * Los valores coinciden con los "realm roles" definidos en Keycloak
 * (infra/keycloak/piedrazul-realm.json). Si mañana se cambia de proveedor de
 * identidad, solo cambia el adaptador que traduce los claims, no este enum.
 */
export enum Rol {
  ADMINISTRADOR = 'administrador',
  AGENDADOR = 'agendador',
  MEDICO = 'medico',
  PACIENTE = 'paciente',
}

/** Personal de Piedrazul que gestiona agendas de otros (no pacientes). */
export const ROLES_PERSONAL: readonly Rol[] = [Rol.ADMINISTRADOR, Rol.AGENDADOR, Rol.MEDICO];

export function esRolValido(valor: string): valor is Rol {
  return (Object.values(Rol) as string[]).includes(valor);
}
