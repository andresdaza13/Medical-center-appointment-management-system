import { useState } from 'react';
import { citasApi } from '../../core/http/api';
import { HistorialPaciente, SugerenciaPaciente } from '../../core/types';
import { Alerta, BuscadorPaciente, Cargando, TablaCitas } from '../../shared/components';
import { mensajeDe } from '../../shared/hooks';

/** RF5: consultar el historial de citas de un paciente a partir de su cédula. */
export function HistorialPage() {
  const [historial, setHistorial] = useState<HistorialPaciente | null>(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const consultar = async (p: SugerenciaPaciente) => {
    setCargando(true);
    setError(null);
    try {
      setHistorial(await citasApi.historial(p.documento));
    } catch (e) {
      setHistorial(null);
      setError(mensajeDe(e));
    } finally {
      setCargando(false);
    }
  };

  return (
    <section>
      <header className="encabezado-pagina">
        <h1>Historial de citas del paciente</h1>
      </header>

      <div className="tarjeta">
        <BuscadorPaciente onSeleccionar={consultar} />
      </div>

      <Alerta tipo="error">{error}</Alerta>
      {cargando && <Cargando />}

      {historial && (
        <div className="tarjeta">
          <div className="resumen-agenda">
               <div>
              <strong>{historial.paciente.nombreCompleto}</strong>
              <div className="texto-suave">
                C.C. {historial.paciente.documento}, celular {historial.paciente.celular}
              </div>
            </div>
            <div className="contador">
              <strong>{historial.total}</strong> {historial.total === 1 ? 'cita' : 'citas'}
            </div>
          </div>
          <TablaCitas
            citas={historial.citas}
            mostrar={{ fecha: true, medico: true }}
            vacio="Este paciente aún no tiene citas."
          />
        </div>
      )}
    </section>
  );
}
