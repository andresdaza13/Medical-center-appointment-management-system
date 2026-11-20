import { useState } from 'react';
import { Link } from 'react-router-dom';
import { citasApi } from '../../core/http/api';
import { CitaDetalle } from '../../core/types';
import { Alerta, Cargando, TablaCitas } from '../../shared/components';
import { diasEntre, hoyIso } from '../../shared/fechas';
import { mensajeDe, useCarga } from '../../shared/hooks';
import { Icono } from '../../shared/iconos';
import { ModalCancelarCita } from '../../shared/ModalCancelarCita';

/** Debe coincidir con ANTICIPACION_MINIMA_CANCELACION_DIAS del backend. */
const ANTICIPACION_DIAS = 2;

export function MisCitasPage() {
  const citas = useCarga(() => citasApi.misCitas(), []);
  const [msg, setMsg] = useState<{ tipo: 'error' | 'exito'; texto: string } | null>(null);
  const [aCancelar, setACancelar] = useState<CitaDetalle | null>(null);

  const confirmarCancelacion = async (justificacion: string) => {
    if (!aCancelar) return;
    try {
      await citasApi.cancelar(aCancelar.id, justificacion);
      setMsg({ tipo: 'exito', texto: 'Su cita fue cancelada.' });
      setACancelar(null);
      await citas.recargar();
    } catch (e) {
      // El backend es quien decide; si rechaza, mostramos su mensaje.
      setMsg({ tipo: 'error', texto: mensajeDe(e) });
      setACancelar(null);
    }
  };

  const hoy = hoyIso();

  return (
    <section>
      <header className="encabezado-pagina">
        <h1>Mis citas</h1>
        <Link className="boton" to="/agendar">
          <Icono nombre="mas" /> Agendar cita
        </Link>
      </header>
      {msg && <Alerta tipo={msg.tipo}>{msg.texto}</Alerta>}
      <Alerta tipo="error">{citas.error}</Alerta>
      {citas.cargando ? (
        <Cargando />
      ) : (
        <div className="tarjeta">
          <TablaCitas
            citas={citas.datos ?? []}
            mostrar={{ fecha: true, medico: true }}
            vacio="Aún no tiene citas. ¡Agende la primera!"
            acciones={(c) => {
              if (c.estado !== 'AGENDADA' || c.fecha < hoy) return null;
              // Prevenir el error en vez de mostrarlo después (usabilidad).
              const aTiempo = diasEntre(hoy, c.fecha) >= ANTICIPACION_DIAS;
              return (
                <button
                  className="boton peligro pequeno"
                  disabled={!aTiempo}
                  title={aTiempo ? undefined : `Solo se puede cancelar con ${ANTICIPACION_DIAS} días de anticipación`}
                  onClick={() => setACancelar(c)}
                >
                  Cancelar
                </button>
              );
            }}
          />
        </div>
      )}
      {aCancelar && (
        <ModalCancelarCita
          cita={aCancelar}
          onConfirmar={confirmarCancelacion}
          onCerrar={() => setACancelar(null)}
        />
      )}
    </section>
  );
}