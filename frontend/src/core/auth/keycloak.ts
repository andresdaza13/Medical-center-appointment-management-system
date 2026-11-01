import Keycloak from 'keycloak-js';
import { config } from '../config';

/**
 * Instancia ÚNICA del cliente de Keycloak (Singleton a nivel de módulo:
 * los módulos ES se evalúan una sola vez, así que todos los que importen
 * `keycloak` reciben el mismo objeto).
 *
 * Flujo usado: Authorization Code + PKCE, el recomendado para SPAs.
 * La contraseña del usuario NUNCA pasa por nuestra aplicación: la escribe en
 * la pantalla de Keycloak, y la app solo recibe tokens.
 */
export const keycloak = new Keycloak({
  url: config.keycloak.url,
  realm: config.keycloak.realm,
  clientId: config.keycloak.clientId,
});

let inicializacion: Promise<boolean> | undefined;

/**
 * Inicializa Keycloak UNA sola vez, aunque se llame varias veces.
 * StrictMode ejecuta los efectos dos veces en desarrollo; guardando la
 * promesa, la segunda llamada recibe la misma en vez de reinicializar.
 */
export function iniciarKeycloak(): Promise<boolean> {
  return (inicializacion ??= keycloak.init({
    onLoad: 'login-required',
    pkceMethod: 'S256',
    checkLoginIframe: false,
  }));
}