import { ReactNode, useEffect, useId, useState } from 'react';
import { pacientesApi } from '../core/http/api';
import { CitaDetalle, ESPECIALIDADES, EstadoCita, Medico, SugerenciaPaciente } from '../core/types';
import { fechaLarga, hora12 } from './fechas';
import { mensajeDe, useDebounce } from './hooks';

// ---------------------------------------------------------------------------
// Mensajes de retroalimentación (RNF usabilidad: "retroalimentación visual
// ante errores o acciones exitosas"). role="alert" lo anuncia a lectores de pantalla.
// ---------------------------------------------------------------------------
export function Alerta({ tipo, children }: { tipo: 'error' | 'exito' | 'info'; children: ReactNode }) {
  if (!children) return null;
  return (
    <div className={`alerta alerta-${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>
      {children}
    </div>
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return <p className="cargando">{texto}</p>;
}

const ETIQUETA_ESTADO: Record<EstadoCita, string> = {
  AGENDADA: 'Agendada',
  ATENDIDA: 'Atendida',
  CANCELADA: 'Cancelada',
};

export function EstadoBadge({ estado }: { estado: EstadoCita }) {
  return <span className={`badge badge-${estado.toLowerCase()}`}>{ETIQUETA_ESTADO[estado]}</span>;
}

// ---------------------------------------------------------------------------
// Selector de médico reutilizado en agenda, configuración y agendamiento.
// ---------------------------------------------------------------------------
export function SelectorMedico(props: {
  medicos: Medico[];
  valor?: number;
  onChange: (id: number) => void;
  etiqueta?: string;
}) {
  const id = useId();
  return (
    <div className="campo">
      <label htmlFor={id}>{props.etiqueta ?? 'Médico / terapista'}</label>
      <select id={id} value={props.valor ?? ''} onChange={(e) => props.onChange(Number(e.target.value))}>
        <option value="" disabled>
          Seleccione…
        </option>
        {props.medicos.map((m) => (
          <option key={m.id} value={m.id}>
            {m.nombres} — {ESPECIALIDADES[m.especialidad]}
            {m.activo ? '' : ' (inactivo)'}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Buscador de pacientes con AUTOCOMPLETADO por cédula (mejora sugerida en el
// segundo corte). Accesible por teclado: flechas, Enter y Escape.
// ---------------------------------------------------------------------------
export function BuscadorPaciente({ onSeleccionar }: { onSeleccionar: (p: SugerenciaPaciente) => void }) {
  const [texto, setTexto] = useState('');
  const [sugerencias, setSugerencias] = useState<SugerenciaPaciente[]>([]);
  const [activo, setActivo] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const buscado = useDebounce(texto.trim(), 300);
  const id = useId();

  useEffect(() => {
    if (!/^\d{3,}$/.test(buscado)) {
      setSugerencias([]);
      return;
    }
    let vigente = true; // ignora respuestas que llegan tarde (condición de carrera)
    pacientesApi
      .autocompletar(buscado)
      .then((r) => vigente && (setSugerencias(r), setActivo(-1), setError(null)))
      .catch((e) => vigente && setError(mensajeDe(e)));
    return () => {
      vigente = false;
    };
  }, [buscado]);

  const elegir = (p: SugerenciaPaciente) => {
    onSeleccionar(p);
    setTexto(p.documento);
    setSugerencias([]);
  };

  return (
    <div className="campo autocompletar">
      <label htmlFor={id}>Cédula del paciente</label>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder="Escriba al menos 3 dígitos"
        value={texto}
        role="combobox"
        aria-expanded={sugerencias.length > 0}
        aria-controls={`${id}-lista`}
        onChange={(e) => setTexto(e.target.value.replace(/\D/g, ''))}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') setActivo((i) => Math.min(i + 1, sugerencias.length - 1));
          else if (e.key === 'ArrowUp') setActivo((i) => Math.max(i - 1, 0));
          else if (e.key === 'Enter' && activo >= 0) {
            e.preventDefault();
            elegir(sugerencias[activo]);
          } else if (e.key === 'Escape') setSugerencias([]);
        }}
      />
      {sugerencias.length > 0 && (
        <ul id={`${id}-lista`} role="listbox" className="sugerencias">
          {sugerencias.map((p, i) => (
            <li
              key={p.id}
              role="option"
              aria-selected={i === activo}
              className={i === activo ? 'activa' : ''}
              onMouseDown={() => elegir(p)}
            >
              <strong>{p.documento}</strong> {p.nombreCompleto}
            </li>
          ))}
        </ul>
      )}
      {buscado.length >= 3 && sugerencias.length === 0 && !error && (
        <small className="ayuda">Sin coincidencias por ahora.</small>
      )}
      <Alerta tipo="error">{error}</Alerta>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabla de citas reutilizada por RF1 (agenda), RF5 (historial) y "Mis citas".
// Las columnas se eligen por props en lugar de duplicar la tabla.
// ---------------------------------------------------------------------------
export function TablaCitas(props: {
  citas: CitaDetalle[];
  mostrar: { fecha?: boolean; paciente?: boolean; medico?: boolean };
  acciones?: (cita: CitaDetalle) => ReactNode;
  vacio: string;
}) {
  const { citas, mostrar, acciones } = props;
  if (citas.length === 0) return <p className="vacio">{props.vacio}</p>;

  return (
    <div className="tabla-contenedor">
      <table>
        <thead>
          <tr>
            {mostrar.fecha && <th>Fecha</th>}
            <th>Hora</th>
            {mostrar.paciente && (
              <>
                <th>Documento</th>
                <th>Paciente</th>
                <th>Celular</th>
                <th>Edad</th>
              </>
            )}
            {mostrar.medico && <th>Profesional</th>}
            <th>Estado</th>
            <th>Observación</th>
            {acciones && <th aria-label="Acciones" />}
          </tr>
        </thead>
        <tbody>
          {citas.map((c) => (
            <tr key={c.id} className={c.estado === 'CANCELADA' ? 'tachada' : ''}>
              {mostrar.fecha && <td>{fechaLarga(c.fecha)}</td>}
              <td>{hora12(c.hora)}</td>
              {mostrar.paciente && (
                <>
                  <td>{c.paciente.documento}</td>
                  <td>{c.paciente.nombreCompleto}</td>
                  <td>{c.paciente.celular}</td>
                  <td>{c.paciente.edad ?? '—'}</td>
                </>
              )}
              {mostrar.medico && (
                <td>
                  {c.medico.nombres}
                  <br />
                  <small>{ESPECIALIDADES[c.medico.especialidad]}</small>
                </td>
              )}
              <td>
                <EstadoBadge estado={c.estado} />
              </td>
              <td>{c.observacion ?? ''}</td>
              {acciones && <td>{acciones(c)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
