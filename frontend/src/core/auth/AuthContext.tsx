import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { Rol } from '../types';
import { iniciarKeycloak, keycloak } from './keycloak';

export interface Usuario {
  username: string;
  nombre: string;
  roles: Rol[];
}

interface AuthState {
  usuario: Usuario;
  tieneRol: (...roles: Rol[]) => boolean;
  esPersonal: boolean;
  cerrarSesion: () => void;
}

const AuthContext = createContext<AuthState | null>(null);
const ROLES: Rol[] = ['administrador', 'agendador', 'medico', 'paciente'];

/**
 * Inicializa Keycloak una sola vez y expone el usuario a toda la app.
 * `login-required`: si no hay sesión, redirige a la pantalla de Keycloak
 * (donde también está el enlace "Registrarse" para pacientes nuevos).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [error, setError] = useState<string | null>(null);

   useEffect(() => {
    let cancelado = false;
    iniciarKeycloak()
      .then(() => {
        if (cancelado) return;
        const t = keycloak.tokenParsed as { preferred_username?: string; name?: string } | undefined;
        setUsuario({
          username: t?.preferred_username ?? '',
          nombre: t?.name ?? t?.preferred_username ?? '',
          roles: (keycloak.realmAccess?.roles ?? []).filter((r): r is Rol => ROLES.includes(r as Rol)),
        });
      })
      .catch((e) => {
        console.error('[Auth] Falló la inicialización de Keycloak', e); // detalle técnico en F12
        if (!cancelado) setError('No fue posible conectar con el servidor de autenticación.');
      });
    return () => {
      cancelado = true;
    };
  }, []);

  const valor = useMemo<AuthState | null>(() => {
    if (!usuario) return null;
    const tieneRol = (...roles: Rol[]) => roles.some((r) => usuario.roles.includes(r));
    return {
      usuario,
      tieneRol,
      esPersonal: tieneRol('administrador', 'agendador', 'medico'),
      cerrarSesion: () => keycloak.logout({ redirectUri: window.location.origin }),
    };
  }, [usuario]);

  if (error) return <div className="pantalla-centro alerta alerta-error">{error}</div>;
  if (!valor) return <div className="pantalla-centro">Cargando…</div>;
  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
