/**
 * Configuración leída de variables de entorno (archivo .env de Vite).
 * Ninguna URL queda escrita "a mano" en los componentes: si cambia el
 * servidor, se cambia aquí (antes había URLs repetidas en cada servicio).
 */
export const config = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  keycloak: {
    url: import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8080',
    realm: import.meta.env.VITE_KEYCLOAK_REALM ?? 'piedrazul',
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'piedrazul-web',
  },
} as const;
