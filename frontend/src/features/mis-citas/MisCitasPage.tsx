import { useState } from 'react';
import { Link } from 'react-router-dom';
import { citasApi } from '../../core/http/api';
import { CitaDetalle } from '../../core/types';
import { Alerta, Cargando, TablaCitas } from '../../shared/components';
import { hoyIso } from '../../shared/fechas';
import { mensajeDe, useCarga } from '../../shared/hooks';
import { Icono } from '../../shared/iconos';

export function MisCitasPage() {
  const citas = useCarga(() => citasApi.misCitas(), []);
  const [msg, setMsg] = useState<{ tipo: 'error' | 'exito'; texto: string } | null>(null);

  const cancelar = async (c: CitaDetalle) => {
    if (!confirm('¿Seguro que desea cancelar esta cita?')) return;
    try {
      await citasApi.cancelar(c.id);
      setMsg({ tipo: 'exito', texto: 'Su cita fue cancelada.' });
      await citas.recargar();
    } catch (e) {
      setMsg({ tipo: 'error', texto: mensajeDe(e) });
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
            acciones={(c) =>
              c.estado === 'AGENDADA' &&
              c.fecha >= hoy && (
                <button className="boton peligro pequeno" onClick={() => cancelar(c)}>
                  Cancelar
                </button>
              )
            }
          />
        </div>
      )}
    </section>
  );
}
