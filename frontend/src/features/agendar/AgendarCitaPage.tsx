import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../core/auth/AuthContext';
import { citasApi, medicosApi } from '../../core/http/api';
import { ESPECIALIDADES, Especialidad, Franja, SugerenciaCita, SugerenciaPaciente } from '../../core/types';
import { Alerta, BuscadorPaciente, Cargando } from '../../shared/components';
import { fechaLarga, hora12, hoyIso } from '../../shared/fechas';
import { mensajeDe, useCarga } from '../../shared/hooks';

interface Seleccion {
  medicoId: number;
  medicoNombres: string;
  fecha: string;
  hora: string;
}

/**
 * RF2: asistente de agendamiento (paciente por la web) y agendamiento manual
 * (personal). Es el mismo flujo; el personal además elige al paciente.
 *
 * Diseño pensado para usuarios con bajo nivel técnico (RNF usabilidad):
 *   1. ¿Qué servicio necesita?   → especialidad (lenguaje del paciente)
 *   2. ¿Cuándo?                   → "próximas citas disponibles" en un clic,
 *                                    o elegir médico + fecha y ver las franjas
 *   3. Confirmar                  → resumen claro antes de guardar
 */
export function AgendarCitaPage() {
  const { esPersonal } = useAuth();
  const navigate = useNavigate();

  const [paciente, setPaciente] = useState<SugerenciaPaciente | null>(null);
  const [especialidad, setEspecialidad] = useState<Especialidad>();
  const [medicoId, setMedicoId] = useState<number>();
  const [fecha, setFecha] = useState(hoyIso());
  const [seleccion, setSeleccion] = useState<Seleccion | null>(null);
  const [observacion, setObservacion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);

  const medicos = useCarga(() => medicosApi.listar(especialidad), [especialidad]);

  const sugerencias = useCarga<SugerenciaCita[]>(
    () => (especialidad ? citasApi.sugerencias({ especialidad, medicoId }) : Promise.resolve([])),
    [especialidad, medicoId],
  );

  const franjas = useCarga<Franja[]>(
    () => (medicoId ? citasApi.disponibilidad(medicoId, fecha) : Promise.resolve([])),
    [medicoId, fecha],
  );

  useEffect(() => setSeleccion(null), [especialidad, medicoId, fecha]);

  const medicoSel = medicos.datos?.find((m) => m.id === medicoId);
  const faltaPaciente = esPersonal && !paciente;

  const confirmar = async () => {
    if (!seleccion) return;
    setEnviando(true);
    setError(null);
    try {
      await citasApi.agendar({
        medicoId: seleccion.medicoId,
        fecha: seleccion.fecha,
        hora: seleccion.hora,
        pacienteId: esPersonal ? paciente?.id : undefined,
        observacion: observacion.trim() || undefined,
      });
      setExito(
        `Cita confirmada con ${seleccion.medicoNombres} el ${fechaLarga(seleccion.fecha)} a las ${hora12(seleccion.hora)}. ` +
          'Preséntese 15 minutos antes en Piedrazul (km 5 vía al Huila).',
      );
      setSeleccion(null);
      await Promise.all([sugerencias.recargar(), franjas.recargar()]);
    } catch (e) {
      setError(mensajeDe(e));
      // Si alguien tomó el turno mientras tanto, refrescamos las opciones.
      await Promise.all([sugerencias.recargar(), franjas.recargar()]);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section>
      <header className="encabezado-pagina">
        <h1>{esPersonal ? 'Agendar cita (manual)' : 'Agendar mi cita'}</h1>
      </header>

      {exito && (
        <Alerta tipo="exito">
          {exito}{' '}
          <button className="enlace" onClick={() => navigate(esPersonal ? '/agenda' : '/mis-citas')}>
            {esPersonal ? 'Ver agenda' : 'Ver mis citas'}
          </button>
        </Alerta>
      )}

      {esPersonal && (
        <div className="tarjeta">
          <h2>1. Paciente</h2>
          <BuscadorPaciente onSeleccionar={setPaciente} />
          {paciente && (
            <p>
              Seleccionado: <strong>{paciente.nombreCompleto}</strong> ({paciente.documento})
            </p>
          )}
          <p className="ayuda">
            ¿Paciente nuevo? <Link to="/pacientes/nuevo">Regístrelo aquí</Link>.
          </p>
        </div>
      )}

      <div className="tarjeta">
        <h2>{esPersonal ? '2.' : '1.'} ¿Qué servicio necesita?</h2>
        <div className="opciones-grandes" role="radiogroup">
          {(Object.keys(ESPECIALIDADES) as Especialidad[]).map((e) => (
            <button
              key={e}
              role="radio"
              aria-checked={especialidad === e}
              className={`opcion ${especialidad === e ? 'seleccionada' : ''}`}
              onClick={() => {
                setEspecialidad(e);
                setMedicoId(undefined);
              }}
            >
              {ESPECIALIDADES[e]}
            </button>
          ))}
        </div>
      </div>

      {especialidad && (
        <div className="tarjeta">
          <h2>{esPersonal ? '3.' : '2.'} ¿Cuándo?</h2>

          <h3>Próximas citas disponibles</h3>
          {sugerencias.cargando ? (
            <Cargando />
          ) : sugerencias.datos?.length ? (
            <div className="franjas">
              {sugerencias.datos.map((s) => (
                <button
                  key={`${s.medicoId}-${s.fecha}-${s.hora}`}
                  className={`franja ancha ${esLaSeleccion(seleccion, s) ? 'seleccionada' : ''}`}
                  onClick={() => setSeleccion(s)}
                >
                  <span>{fechaLarga(s.fecha)}</span>
                  <strong>{hora12(s.hora)}</strong>
                  <small>{s.medicoNombres}</small>
                </button>
              ))}
            </div>
          ) : (
            <p className="vacio">No hay citas disponibles en las próximas semanas para este servicio.</p>
          )}

          <details className="otra-fecha">
            <summary>Prefiero elegir el profesional y la fecha</summary>
            <div className="filtros">
              <div className="campo">
                <label htmlFor="medico-agendar">Profesional</label>
                <select
                  id="medico-agendar"
                  value={medicoId ?? ''}
                  onChange={(e) => setMedicoId(e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">Cualquiera</option>
                  {medicos.datos
                    ?.filter((m) => m.activo)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombres}
                      </option>
                    ))}
                </select>
              </div>
              <div className="campo">
                <label htmlFor="fecha-agendar">Fecha</label>
                <input
                  id="fecha-agendar"
                  type="date"
                  min={hoyIso()}
                  value={fecha}
                  onChange={(e) => e.target.value && setFecha(e.target.value)}
                />
              </div>
            </div>
            {medicoId &&
              (franjas.cargando ? (
                <Cargando />
              ) : franjas.datos?.length ? (
                <div className="franjas">
                  {franjas.datos.map((f) => {
                    const s = { medicoId, medicoNombres: medicoSel?.nombres ?? '', ...f };
                    return (
                      <button
                        key={f.hora}
                        className={`franja ${esLaSeleccion(seleccion, s) ? 'seleccionada' : ''}`}
                        onClick={() => setSeleccion(s)}
                      >
                        {hora12(f.hora)}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="vacio">{medicoSel?.nombres} no tiene franjas libres ese día.</p>
              ))}
          </details>
        </div>
      )}

      {seleccion && (
        <div className="tarjeta confirmacion">
          <h2>{esPersonal ? '4.' : '3.'} Confirmar</h2>
          <p>
            <strong>{seleccion.medicoNombres}</strong>
            <br />
            {fechaLarga(seleccion.fecha)} a las <strong>{hora12(seleccion.hora)}</strong>
          </p>
          <div className="campo">
            <label htmlFor="observacion">Observación (opcional)</label>
            <textarea
              id="observacion"
              maxLength={500}
              rows={2}
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
            />
          </div>
          <Alerta tipo="error">{error}</Alerta>
          {faltaPaciente && <Alerta tipo="info">Seleccione primero al paciente.</Alerta>}
          <button className="boton grande" onClick={confirmar} disabled={enviando || faltaPaciente}>
            {enviando ? 'Agendando…' : 'Confirmar cita'}
          </button>
        </div>
      )}
    </section>
  );
}

function esLaSeleccion(sel: Seleccion | null, s: { medicoId: number; fecha: string; hora: string }) {
  return !!sel && sel.medicoId === s.medicoId && sel.fecha === s.fecha && sel.hora === s.hora;
}
