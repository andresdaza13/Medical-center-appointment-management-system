import { ReactNode } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../core/auth/AuthContext';
import { Rol } from '../core/types';
import { AgendaPage } from '../features/agenda/AgendaPage';
import { AgendarCitaPage } from '../features/agendar/AgendarCitaPage';
import { ConfiguracionPage } from '../features/configuracion/ConfiguracionPage';
import { HistorialPage } from '../features/historial/HistorialPage';
import { MisCitasPage } from '../features/mis-citas/MisCitasPage';
import { CompletarPerfilPage, RegistrarPacientePage, RequierePerfilPaciente } from '../features/pacientes/PacientesPages';
import { Layout } from './Layout';

const PERSONAL: Rol[] = ['administrador', 'agendador', 'medico'];

/**
 * Protege una ruta por rol. Es solo COMODIDAD para el usuario (no muestra lo
 * que no puede usar): la seguridad real la aplica el backend en cada petición.
 */
function RequiereRol({ roles, children }: { roles: Rol[]; children: ReactNode }) {
  const { tieneRol } = useAuth();
  return tieneRol(...roles) ? <>{children}</> : <Navigate to="/" replace />;
}

function Inicio() {
  const { esPersonal } = useAuth();
  return <Navigate to={esPersonal ? '/agenda' : '/mis-citas'} replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/completar-perfil" element={<RequiereRol roles={['paciente']}><CompletarPerfilPage /></RequiereRol>} />
          <Route
            path="/*"
            element={
              <RequierePerfilPaciente>
                <Routes>
                  <Route index element={<Inicio />} />
                  <Route path="agenda" element={<RequiereRol roles={PERSONAL}><AgendaPage /></RequiereRol>} />
                  <Route path="agendar" element={<AgendarCitaPage />} />
                  <Route path="historial" element={<RequiereRol roles={PERSONAL}><HistorialPage /></RequiereRol>} />
                  <Route path="pacientes/nuevo" element={<RequiereRol roles={PERSONAL}><RegistrarPacientePage /></RequiereRol>} />
                  <Route path="mis-citas" element={<RequiereRol roles={['paciente']}><MisCitasPage /></RequiereRol>} />
                  <Route path="configuracion" element={<RequiereRol roles={['administrador']}><ConfiguracionPage /></RequiereRol>} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </RequierePerfilPaciente>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
