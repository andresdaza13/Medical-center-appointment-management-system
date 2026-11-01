import { ReactNode, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../core/auth/AuthContext';
import { keycloak } from '../../core/auth/keycloak';
import { ApiError } from '../../core/http/api-client';
import { pacientesApi } from '../../core/http/api';
import { Paciente } from '../../core/types';
import { Alerta, Cargando } from '../../shared/components';
import { useCarga } from '../../shared/hooks';
import { FormularioPaciente } from './FormularioPaciente';

/**
 * Para usuarios con rol paciente: si aún no completaron su ficha (cédula,
 * celular...), los lleva a hacerlo antes de usar el resto de la aplicación.
 */
export function RequierePerfilPaciente({ children }: { children: ReactNode }) {
  const { tieneRol } = useAuth();
  const esPaciente = tieneRol('paciente');
  const perfil = useCarga(async (): Promise<Paciente | null | 'no-aplica'> => {
    if (!esPaciente) return 'no-aplica';
    try {
      return await pacientesApi.miPerfil();
    } catch (e) {
      // 404 = el usuario existe en Keycloak pero aún no tiene ficha de paciente.
      if (e instanceof ApiError && e.status === 404) return null;
      throw e; // cualquier otro error se muestra, no se confunde con "sin perfil"
    }
  }, [esPaciente]);

  if (!esPaciente) return <>{children}</>;
  if (perfil.cargando) return <Cargando />;
  if (perfil.error) return <Alerta tipo="error">{perfil.error}</Alerta>;
  if (perfil.datos === null) return <Navigate to="/completar-perfil" replace />;
  return <>{children}</>;
}

export function CompletarPerfilPage() {
  const navigate = useNavigate();
  const correo = (keycloak.tokenParsed as { email?: string } | undefined)?.email;

  return (
    <section className="angosta">
      <header className="encabezado-pagina">
        <h1>Completa tus datos</h1>
      </header>
      <p>Antes de agendar tu primera cita necesitamos estos datos. Solo se piden una vez.</p>
      <FormularioPaciente
        textoBoton="Guardar y continuar"
        correoInicial={correo}
        onGuardar={async (datos) => {
          await pacientesApi.registrarMiPerfil(datos);
          navigate('/agendar', { replace: true });
        }}
      />
    </section>
  );
}

export function RegistrarPacientePage() {
  const [creado, setCreado] = useState<Paciente | null>(null);

  return (
    <section className="angosta">
      <header className="encabezado-pagina">
        <h1>Registrar paciente</h1>
      </header>
      {creado && (
        <Alerta tipo="exito">
          Paciente {creado.nombreCompleto} ({creado.documento}) registrado. Ya puede agendarle una cita.
        </Alerta>
      )}
      <FormularioPaciente
        key={creado?.id ?? 'nuevo'}
        textoBoton="Registrar paciente"
        onGuardar={async (datos) => {
          try {
            setCreado(await pacientesApi.registrar(datos));
          } catch (e) {
            if (e instanceof ApiError && e.status === 409) {
              throw new Error('Ya existe un paciente con esa cédula. Búsquelo en "Agendar cita".');
            }
            throw e;
          }
        }}
      />
    </section>
  );
}
