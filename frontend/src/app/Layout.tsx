import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../core/auth/AuthContext';
import { Rol } from '../core/types';
import { Icono, NombreIcono } from '../shared/iconos';

interface Enlace {
  ruta: string;
  texto: string;
  icono: NombreIcono;
  roles: Rol[];
}

/** El menú se arma según los roles: cada usuario ve solo lo que puede usar. */
const MENU: Enlace[] = [
  { ruta: '/agenda', texto: 'Agenda del día', icono: 'calendario', roles: ['administrador', 'agendador', 'medico'] },
  { ruta: '/agendar', texto: 'Agendar cita', icono: 'mas', roles: ['administrador', 'agendador', 'medico', 'paciente'] },
  { ruta: '/mis-citas', texto: 'Mis citas', icono: 'lista', roles: ['paciente'] },
  { ruta: '/historial', texto: 'Historial', icono: 'reloj', roles: ['administrador', 'agendador', 'medico'] },
  { ruta: '/pacientes/nuevo', texto: 'Nuevo paciente', icono: 'persona', roles: ['administrador', 'agendador', 'medico'] },
  { ruta: '/configuracion', texto: 'Configuración', icono: 'ajustes', roles: ['administrador'] },
];

const NOMBRE_ROL: Record<Rol, string> = {
  administrador: 'Administrador',
  agendador: 'Agendador',
  medico: 'Médico',
  paciente: 'Paciente',
};

export function Layout() {
  const { usuario, tieneRol, cerrarSesion } = useAuth();
  const iniciales = usuario.nombre
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  return (
    <div className="app">
      <a className="saltar" href="#contenido">
        Saltar al contenido
      </a>

      <aside className="lateral">
        <div className="marca">
          <span className="marca-logo" aria-hidden="true">
            <Icono nombre="piedra" />
          </span>
          <span>
            <strong>Piedrazul</strong>
            <small>Citas médicas</small>
          </span>
        </div>

        <nav aria-label="Principal" className="menu">
          {MENU.filter((e) => tieneRol(...e.roles)).map((e) => (
            <NavLink key={e.ruta} to={e.ruta}>
              <Icono nombre={e.icono} />
              <span>{e.texto}</span>
            </NavLink>
          ))}
        </nav>

        <div className="cuenta">
          {/* Señal de confianza: el usuario sabe que su sesión está protegida. */}
          <p className="sesion-segura">
            <Icono nombre="candado" />
            Sesión protegida
          </p>
          <div className="usuario">
            <span className="avatar" aria-hidden="true">
              {iniciales}
            </span>
            <span className="usuario-datos">
              <strong>{usuario.nombre}</strong>
              <small>{usuario.roles.map((r) => NOMBRE_ROL[r]).join(', ')}</small>
            </span>
          </div>
          <button className="boton secundario bloque" onClick={cerrarSesion}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main id="contenido">
        <Outlet />
      </main>
    </div>
  );
}