import { Injectable } from '@nestjs/common';
import { esRolValido, Rol } from '../domain/rol';
import { UsuarioAutenticado } from '../domain/usuario-autenticado';

/** Forma (parcial) del access token que emite Keycloak. */
export interface KeycloakTokenPayload {
  sub: string;
  preferred_username?: string;
  email?: string;
  name?: string;
  realm_access?: { roles?: string[] };
}

/**
 * PATRÓN ADAPTER (GoF, estructural).
 *
 * Problema: Keycloak entrega los roles en `realm_access.roles`, mezclados con
 * roles técnicos ("offline_access", "default-roles-piedrazul"...). El dominio
 * espera un UsuarioAutenticado con roles tipados.
 *
 * Solución: esta clase convierte la interfaz de Keycloak (Adaptee) en la que el
 * dominio espera (Target). Si mañana se usa Auth0 o Cognito, se escribe otro
 * adaptador y el resto del sistema no se entera.
 */
@Injectable()
export class KeycloakClaimsAdapter {
  adaptar(payload: KeycloakTokenPayload): UsuarioAutenticado {
    const roles: Rol[] = (payload.realm_access?.roles ?? []).filter(esRolValido);

    return new UsuarioAutenticado(
      payload.sub,
      payload.preferred_username ?? payload.sub,
      roles,
      payload.email,
      payload.name,
    );
  }
}
