import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../core/auth/AuthContext';
import { Rol } from '../core/types';

interface Enlace {
  ruta: string;
  texto: string;
  roles: Rol[];
}

/** El menú se arma según los roles: cada usuario ve solo lo que puede usar. */
const MENU: Enlace[] = [
  { ruta: '/agenda', texto: 'Agenda del día', roles: ['administrador', 'agendador', 'medico'] },
  { ruta: '/agendar', texto: 'Agendar cita', roles: ['administrador', 'agendador', 'medico', 'paciente'] },
  { ruta: '/historial', texto: 'Historial por cédula', roles: ['administrador', 'agendador', 'medico'] },
  { ruta: '/pacientes/nuevo', texto: 'Registrar paciente', roles: ['administrador', 'agendador', 'medico'] },
  { ruta: '/mis-citas', texto: 'Mis citas', roles: ['paciente'] },
  { ruta: '/configuracion', texto: 'Configuración', roles: ['administrador'] },
];

export function Layout() {
  const { usuario, tieneRol, cerrarSesion } = useAuth();

  return (
    <div className="app">
      <a className="saltar" href="#contenido">
        Saltar al contenido
      </a>
      <header className="barra">
        <span className="marca">Piedrazul · Citas</span>
        <nav aria-label="Principal">
          {MENU.filter((e) => tieneRol(...e.roles)).map((e) => (
            <NavLink key={e.ruta} to={e.ruta}>
              {e.texto}
            </NavLink>
          ))}
        </nav>
        <div className="usuario">
          <span>{usuario.nombre}</span>
          <button className="boton secundario pequeno" onClick={cerrarSesion}>
            Salir
          </button>
        </div>
      </header>
      <main id="contenido">
        <Outlet />
      </main>
    </div>
  );
}
