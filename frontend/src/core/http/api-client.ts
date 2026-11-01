import { keycloak } from '../auth/keycloak';
import { config } from '../config';

/** Error HTTP con el mensaje que envía el backend (DomainExceptionFilter). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

type Query = Record<string, string | number | undefined>;

/**
 * Cliente HTTP de la aplicación — PATRÓN SINGLETON (GoF, creacional).
 *
 * Una sola instancia centraliza lo que antes estaba repetido en cada servicio:
 *   - URL base,
 *   - adjuntar el token de Keycloak (`Authorization: Bearer ...`),
 *   - renovar el token si está por expirar,
 *   - convertir respuestas de error en ApiError con un mensaje legible.
 *
 * Actúa como un INTERCEPTOR: toda petición pasa por `solicitar()`. El
 * constructor es privado; la única forma de obtenerlo es `ApiClient.instancia`.
 */
export class ApiClient {
  private static unico: ApiClient | undefined;

  private constructor(private readonly baseUrl: string) {}

  static get instancia(): ApiClient {
    return (ApiClient.unico ??= new ApiClient(config.apiUrl));
  }

  get<T>(ruta: string, query?: Query) {
    return this.solicitar<T>('GET', ruta, { query });
  }
  post<T>(ruta: string, cuerpo?: unknown) {
    return this.solicitar<T>('POST', ruta, { cuerpo });
  }
  put<T>(ruta: string, cuerpo?: unknown) {
    return this.solicitar<T>('PUT', ruta, { cuerpo });
  }
  patch<T>(ruta: string, cuerpo?: unknown) {
    return this.solicitar<T>('PATCH', ruta, { cuerpo });
  }

  /** Descarga un archivo (p. ej. el CSV del RF4) y lo guarda en el equipo. */
  async descargar(ruta: string, query: Query, nombrePorDefecto: string): Promise<void> {
    const respuesta = await this.fetchConToken('GET', ruta, { query });
    const blob = await respuesta.blob();
    const disposition = respuesta.headers.get('Content-Disposition') ?? '';
    const nombre = /filename="([^"]+)"/.exec(disposition)?.[1] ?? nombrePorDefecto;

    const url = URL.createObjectURL(blob);
    const enlace = Object.assign(document.createElement('a'), { href: url, download: nombre });
    enlace.click();
    URL.revokeObjectURL(url);
  }

  private async solicitar<T>(metodo: string, ruta: string, opciones: { query?: Query; cuerpo?: unknown }): Promise<T> {
    const respuesta = await this.fetchConToken(metodo, ruta, opciones);
    return (respuesta.status === 204 ? undefined : await respuesta.json()) as T;
  }

  private async fetchConToken(
    metodo: string,
    ruta: string,
    { query, cuerpo }: { query?: Query; cuerpo?: unknown },
  ): Promise<Response> {
    // Renueva el access token si expira en menos de 30 s.
    try {
      await keycloak.updateToken(30);
    } catch {
      await keycloak.login();
    }

    const url = new URL(this.baseUrl + ruta);
    Object.entries(query ?? {}).forEach(([k, v]) => v !== undefined && v !== '' && url.searchParams.set(k, String(v)));

    const respuesta = await fetch(url, {
      method: metodo,
      headers: {
        Authorization: `Bearer ${keycloak.token}`,
        ...(cuerpo !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
    });

    if (!respuesta.ok) throw await ApiClient.aError(respuesta);
    return respuesta;
  }

  private static async aError(respuesta: Response): Promise<ApiError> {
    if (respuesta.status === 401) return new ApiError(401, 'Su sesión expiró. Vuelva a iniciar sesión.');
    if (respuesta.status === 429) return new ApiError(429, 'Demasiadas solicitudes. Espere un momento.');
    try {
      const cuerpo = (await respuesta.json()) as { message?: string | string[] };
      const msg = Array.isArray(cuerpo.message) ? cuerpo.message.join('. ') : cuerpo.message;
      return new ApiError(respuesta.status, msg ?? 'Ocurrió un error inesperado');
    } catch {
      return new ApiError(respuesta.status, 'Ocurrió un error inesperado');
    }
  }
}
