import { FormEvent, useEffect, useState } from 'react';
import { configuracionApi, medicosApi } from '../../core/http/api';
import { DIAS_SEMANA, ESPECIALIDADES, Especialidad, Horario, Medico, TipoProfesional } from '../../core/types';
import { Alerta, Cargando, SelectorMedico } from '../../shared/components';
import { mensajeDe, useCarga } from '../../shared/hooks';

/**
 * RF3: el administrador configura los parámetros del agendamiento autónomo:
 *  - ventana de tiempo (semanas) en que se habilitan las citas,
 *  - por cada profesional: días que atiende, franja horaria e intervalo.
 * Además gestiona los profesionales (alta y activación).
 */
export function ConfiguracionPage() {
  return (
    <section>
      <header className="encabezado-pagina">
        <h1>Configuración del agendamiento</h1>
      </header>
      <VentanaAgendamiento />
      <Profesionales />
    </section>
  );
}

function VentanaAgendamiento() {
  const config = useCarga(() => configuracionApi.obtener(), []);
  const [semanas, setSemanas] = useState(4);
  const [msg, setMsg] = useState<{ tipo: 'error' | 'exito'; texto: string } | null>(null);

  useEffect(() => {
    if (config.datos) setSemanas(config.datos.ventanaSemanas);
  }, [config.datos]);

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await configuracionApi.actualizar(semanas);
      setMsg({ tipo: 'exito', texto: `Los pacientes podrán agendar hasta ${semanas} semanas adelante.` });
    } catch (err) {
      setMsg({ tipo: 'error', texto: mensajeDe(err) });
    }
  };

  return (
    <form className="tarjeta" onSubmit={guardar}>
      <h2>Ventana de agendamiento</h2>
      {config.cargando ? (
        <Cargando />
      ) : (
        <div className="filtros">
          <div className="campo">
            <label htmlFor="ventana">Semanas habilitadas para agendar</label>
            <input
              id="ventana"
              type="number"
              min={1}
              max={26}
              value={semanas}
              onChange={(e) => setSemanas(Number(e.target.value))}
            />
          </div>
          <button className="boton">Guardar</button>
        </div>
      )}
      {msg && <Alerta tipo={msg.tipo}>{msg.texto}</Alerta>}
    </form>
  );
}

function Profesionales() {
  const medicos = useCarga(() => medicosApi.listar(), []);
  const [medicoId, setMedicoId] = useState<number>();
  const medico = medicos.datos?.find((m) => m.id === medicoId);

  const actualizarEnLista = (m: Medico) =>
    medicos.setDatos((lista) => lista?.map((x) => (x.id === m.id ? m : x)));

  return (
    <div className="tarjeta">
      <h2>Profesionales y horarios</h2>
      <Alerta tipo="error">{medicos.error}</Alerta>
      {medicos.cargando ? (
        <Cargando />
      ) : (
        <SelectorMedico medicos={medicos.datos ?? []} valor={medicoId} onChange={setMedicoId} />
      )}

      {medico && <EditorHorario key={medico.id} medico={medico} onGuardado={actualizarEnLista} />
       
      }

      <NuevoProfesional
        onCreado={(m) => {
          medicos.setDatos((lista) => [...(lista ?? []), m]);
          setMedicoId(m.id);
        }}
      />
    </div>
  );
}

const HORARIO_POR_DEFECTO: Horario = { diasAtencion: [1, 2, 3, 4, 5], horaInicio: '07:00', horaFin: '11:00', intervaloMinutos: 20 };

function EditorHorario({ medico, onGuardado }: { medico: Medico; onGuardado: (m: Medico) => void }) {
  const [h, setH] = useState<Horario>(medico.horario ?? HORARIO_POR_DEFECTO);
  const [msg, setMsg] = useState<{ tipo: 'error' | 'exito'; texto: string } | null>(null);

  const alternarDia = (dia: number) =>
    setH((x) => ({
      ...x,
      diasAtencion: x.diasAtencion.includes(dia) ? x.diasAtencion.filter((d) => d !== dia) : [...x.diasAtencion, dia],
    }));

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    try {
      onGuardado(await medicosApi.configurarHorario(medico.id, h));
      setMsg({ tipo: 'exito', texto: 'Horario guardado.' });
    } catch (err) {
      setMsg({ tipo: 'error', texto: mensajeDe(err) });
    }
  };

  const cambiarEstado = async () => {
    try {
      onGuardado(await medicosApi.cambiarEstado(medico.id, !medico.activo));
    } catch (err) {
      setMsg({ tipo: 'error', texto: mensajeDe(err) });
    }
  };

  return (
    <form className="subtarjeta" onSubmit={guardar}>
      <div className="encabezado-pagina">
          <h3>
          {medico.nombres}
          <small className="texto-suave"> {ESPECIALIDADES[medico.especialidad]}</small>
        </h3>
        <button type="button" className={`boton pequeno ${medico.activo ? 'peligro' : 'secundario'}`} onClick={cambiarEstado}>
          {medico.activo ? 'Desactivar' : 'Activar'}
        </button>
      </div>

      <fieldset>
        <legend>Días de atención</legend>
        <div className="dias">
          {DIAS_SEMANA.map((nombre, i) => (
            <label key={nombre} className="chip">
              <input type="checkbox" checked={h.diasAtencion.includes(i + 1)} onChange={() => alternarDia(i + 1)} />
              {nombre}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="filtros">
        <div className="campo">
          <label htmlFor="inicio">Hora de inicio</label>
          <input id="inicio" type="time" value={h.horaInicio} onChange={(e) => setH({ ...h, horaInicio: e.target.value })} />
        </div>
        <div className="campo">
          <label htmlFor="fin">Hora de fin</label>
          <input id="fin" type="time" value={h.horaFin} onChange={(e) => setH({ ...h, horaFin: e.target.value })} />
        </div>
        <div className="campo">
          <label htmlFor="intervalo">Minutos entre citas</label>
          <input
            id="intervalo"
            type="number"
            min={5}
            max={240}
            value={h.intervaloMinutos}
            onChange={(e) => setH({ ...h, intervaloMinutos: Number(e.target.value) })}
          />
        </div>
      </div>
      {msg && <Alerta tipo={msg.tipo}>{msg.texto}</Alerta>}
      <button className="boton">Guardar horario</button>
    </form>
  );
}

function NuevoProfesional({ onCreado }: { onCreado: (m: Medico) => void }) {
  const [nombres, setNombres] = useState('');
  const [tipo, setTipo] = useState<TipoProfesional>('MEDICO');
  const [especialidad, setEspecialidad] = useState<Especialidad>('TERAPIA_NEURAL');
  const [error, setError] = useState<string | null>(null);

  const crear = async (e: FormEvent) => {
    e.preventDefault();
    try {
      onCreado(await medicosApi.registrar({ nombres, tipo, especialidad }));
      setNombres('');
      setError(null);
    } catch (err) {
      setError(mensajeDe(err));
    }
  };

  return (
    <details className="otra-fecha">
      <summary>Registrar un nuevo profesional</summary>
      <form className="filtros" onSubmit={crear}>
        <div className="campo">
          <label htmlFor="nuevo-nombre">Nombre completo</label>
          <input id="nuevo-nombre" required minLength={3} value={nombres} onChange={(e) => setNombres(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="nuevo-tipo">Tipo</label>
          <select id="nuevo-tipo" value={tipo} onChange={(e) => setTipo(e.target.value as TipoProfesional)}>
            <option value="MEDICO">Médico</option>
            <option value="TERAPISTA">Terapista</option>
          </select>
        </div>
        <div className="campo">
          <label htmlFor="nuevo-esp">Especialidad</label>
          <select id="nuevo-esp" value={especialidad} onChange={(e) => setEspecialidad(e.target.value as Especialidad)}>
            {(Object.keys(ESPECIALIDADES) as Especialidad[]).map((k) => (
              <option key={k} value={k}>
                {ESPECIALIDADES[k]}
              </option>
            ))}
          </select>
        </div>
        <button className="boton">Registrar</button>
      </form>
      <Alerta tipo="error">{error}</Alerta>
    </details>
  );
}
