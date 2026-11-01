import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../core/auth/AuthContext';
import { citasApi, exportacionApi, medicosApi } from '../../core/http/api';
import { CitaDetalle } from '../../core/types';
import { Alerta, Cargando, SelectorMedico, TablaCitas } from '../../shared/components';
import { fechaLarga, hoyIso } from '../../shared/fechas';
import { mensajeDe, useCarga } from '../../shared/hooks';

/**
 * RF1: listar las citas de un médico en una fecha (búsqueda con filtros y
 * resultados en tabla, con la cantidad de citas).
 * RF4: exportar ese mismo listado a CSV (o texto plano para imprimir).
 */
export function AgendaPage() {
  const { tieneRol } = useAuth();
  const medicos = useCarga(() => medicosApi.listar(), []);
  const [medicoId, setMedicoId] = useState<number>();
  const [fecha, setFecha] = useState(hoyIso());
  const [mensaje, setMensaje] = useState<{ tipo: 'error' | 'exito'; texto: string } | null>(null);

  const agenda = useCarga(
    () => (medicoId ? citasApi.agendaDelDia(medicoId, fecha) : Promise.resolve(undefined)),
    [medicoId, fecha],
  );

  const exportar = async (formato: 'csv' | 'txt') => {
    if (!medicoId) return;
    try {
      await exportacionApi.agenda(medicoId, fecha, formato);
      setMensaje({ tipo: 'exito', texto: 'Archivo descargado.' });
    } catch (e) {
      setMensaje({ tipo: 'error', texto: mensajeDe(e) });
    }
  };

  const cancelar = async (cita: CitaDetalle) => {
    if (!confirm(`¿Cancelar la cita de ${cita.paciente.nombreCompleto} a las ${cita.hora}?`)) return;
    try {
      await citasApi.cancelar(cita.id);
      setMensaje({ tipo: 'exito', texto: 'Cita cancelada. El turno quedó libre.' });
      await agenda.recargar();
    } catch (e) {
      setMensaje({ tipo: 'error', texto: mensajeDe(e) });
    }
  };

  const puedeCancelar = tieneRol('agendador', 'administrador');

  return (
    <section>
      <header className="encabezado-pagina">
        <h1>Agenda del día</h1>
        {tieneRol('agendador', 'administrador', 'medico') && (
          <Link className="boton" to="/agendar">
            + Nueva cita
          </Link>
        )}
      </header>

      <div className="filtros tarjeta">
        {medicos.cargando ? (
          <Cargando />
        ) : (
          <SelectorMedico medicos={medicos.datos ?? []} valor={medicoId} onChange={setMedicoId} />
        )}
        <div className="campo">
          <label htmlFor="fecha-agenda">Fecha</label>
          <input id="fecha-agenda" type="date" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} />
        </div>
      </div>

      <Alerta tipo="error">{medicos.error ?? agenda.error}</Alerta>
      {mensaje && <Alerta tipo={mensaje.tipo}>{mensaje.texto}</Alerta>}

      {!medicoId && <p className="vacio">Seleccione un médico o terapista para ver su agenda.</p>}
      {medicoId && agenda.cargando && <Cargando />}
      {agenda.datos && (
        <div className="tarjeta">
          <div className="resumen-agenda">
            <div>
              <strong>{agenda.datos.medico.nombres}</strong>
              <span className="texto-suave"> · {fechaLarga(agenda.datos.fecha)}</span>
            </div>
            <div className="contador" aria-live="polite">
              Total citas: <strong>{agenda.datos.total}</strong>
            </div>
            <div className="acciones">
              <button className="boton secundario" onClick={() => exportar('csv')} disabled={agenda.datos.total === 0}>
                Exportar CSV
              </button>
              <button className="boton secundario" onClick={() => exportar('txt')} disabled={agenda.datos.total === 0}>
                Listado para imprimir
              </button>
            </div>
          </div>
          <TablaCitas
            citas={agenda.datos.citas}
            mostrar={{ paciente: true }}
            vacio="No hay citas para este día."
            acciones={
              puedeCancelar
                ? (c) =>
                    c.estado === 'AGENDADA' && (
                      <button className="boton peligro pequeno" onClick={() => cancelar(c)}>
                        Cancelar
                      </button>
                    )
                : undefined
            }
          />
        </div>
      )}
    </section>
  );
}
