import { useState } from 'react';
import { reportesApi } from '../../core/http/api';
import { ReporteCitasPorMes, SerieMedico } from '../../core/types';
import { Alerta, Cargando } from '../../shared/components';
import { useCarga } from '../../shared/hooks';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const PALETA = ['#2563eb', '#16a34a', '#dc2626', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];
const ANIO_MINIMO = 2020;

function colorPara(indice: number) {
  return PALETA[indice % PALETA.length];
}

/** Años que acepta el backend: 2020 … año actual + 1, del más reciente al más viejo. */
function aniosDisponibles(): number[] {
  const actual = new Date().getFullYear();
  const opciones: number[] = [];
  for (let a = actual + 1; a >= ANIO_MINIMO; a--) opciones.push(a);
  return opciones;
}

/**
 * RF7: reporte gráfico de cantidad de citas por mes y médico, con selección de
 * año. El backend ya devuelve los 12 meses por médico (con 0 donde no hay
 * citas), ordena alfabéticamente y excluye las canceladas; aquí solo se pinta.
 */
export function ReportePage() {
  const [anio, setAnio] = useState(new Date().getFullYear());
  const reporte = useCarga(() => reportesApi.citasPorMes(anio), [anio]);

  return (
    <section>
      <header className="encabezado-pagina">
        <h1>Reporte de citas</h1>
      </header>
      <p className="texto-suave">
        Cantidad de citas por mes y médico. Se excluyen las citas canceladas.
      </p>

      <div className="filtros tarjeta">
        <div className="campo">
          <label htmlFor="anio-reporte">Año</label>
          <select id="anio-reporte" value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
            {aniosDisponibles().map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Alerta tipo="error">{reporte.error}</Alerta>
      {reporte.cargando && <Cargando texto="Generando reporte…" />}

      {reporte.datos && reporte.datos.series.length === 0 && (
        <p className="vacio">No hay citas registradas para {reporte.datos.anio}.</p>
      )}

      {reporte.datos && reporte.datos.series.length > 0 && (
        <>
          <div className="tarjeta" style={{ marginTop: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                flexWrap: 'wrap',
                gap: 8,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 18 }}>
                Citas por mes y médico en {reporte.datos.anio}
              </h2>
              <div className="contador">
                <strong>{reporte.datos.totalGeneral}</strong> citas en total
              </div>
            </div>

            <GraficoBarras series={reporte.datos.series} anio={reporte.datos.anio} />
            <Leyenda series={reporte.datos.series} />
          </div>

          <TablaResumen reporte={reporte.datos} />
        </>
      )}
    </section>
  );
}

/**
 * Gráfico de barras agrupadas (una barra por médico en cada mes) hecho con CSS.
 * La altura de cada barra es proporcional al máximo del año. Sin librerías.
 */
function GraficoBarras({ series, anio }: { series: SerieMedico[]; anio: number }) {
  const maximo = Math.max(1, ...series.flatMap((s) => s.citasPorMes));

  return (
    <div
      role="img"
      aria-label={`Gráfico de barras de citas por mes y médico en ${anio}`}
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 8,
        height: 320,
        padding: '16px 8px 0',
        overflowX: 'auto',
      }}
    >
      {MESES.map((mes, i) => (
        <div
          key={mes}
          style={{
            flex: '1 0 44px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <div
            style={{
              flex: 1,
              width: '100%',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              gap: 2,
            }}
          >
            {series.map((s, idx) => {
              const valor = s.citasPorMes[i] ?? 0;
              return (
                <div
                  key={s.medicoId}
                  title={`${s.medico} — ${mes}: ${valor} ${valor === 1 ? 'cita' : 'citas'}`}
                  aria-label={`${s.medico}, ${mes}: ${valor}`}
                  style={{
                    width: 8,
                    height: `${(valor / maximo) * 100}%`,
                    minHeight: valor > 0 ? 2 : 0,
                    background: colorPara(idx),
                    borderRadius: '2px 2px 0 0',
                  }}
                />
              );
            })}
          </div>
          <small style={{ fontSize: 11, color: '#64748b' }}>{mes}</small>
        </div>
      ))}
    </div>
  );
}

/** Leyenda: color de cada médico con su total anual. */
function Leyenda({ series }: { series: SerieMedico[] }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
      {series.map((s, idx) => (
        <span key={s.medicoId} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
          <span
            aria-hidden="true"
            style={{ width: 12, height: 12, borderRadius: 3, background: colorPara(idx) }}
          />
          {s.medico} <strong>({s.total})</strong>
        </span>
      ))}
    </div>
  );
}

/** Tabla con el detalle mes a mes y los totales por médico y general. */
function TablaResumen({ reporte }: { reporte: ReporteCitasPorMes }) {
  const totalPorMes = MESES.map((_, i) =>
    reporte.series.reduce((acc, s) => acc + (s.citasPorMes[i] ?? 0), 0),
  );

  return (
    <div className="tarjeta" style={{ marginTop: 16 }}>
      <h2 style={{ marginTop: 0, fontSize: 18 }}>Detalle por mes</h2>
      <div className="tabla-contenedor">
        <table>
          <thead>
            <tr>
              <th>Médico / terapista</th>
              {MESES.map((m) => (
                <th key={m} style={{ textAlign: 'right' }}>
                  {m}
                </th>
              ))}
              <th style={{ textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {reporte.series.map((s) => (
              <tr key={s.medicoId}>
                <td>{s.medico}</td>
                {s.citasPorMes.map((v, i) => (
                  <td key={i} style={{ textAlign: 'right' }}>
                    {v}
                  </td>
                ))}
                <td style={{ textAlign: 'right' }}>
                  <strong>{s.total}</strong>
                </td>
              </tr>
            ))}
            <tr>
              <td>
                <strong>Total general</strong>
              </td>
              {totalPorMes.map((v, i) => (
                <td key={i} style={{ textAlign: 'right' }}>
                  <strong>{v}</strong>
                </td>
              ))}
              <td style={{ textAlign: 'right' }}>
                <strong>{reporte.totalGeneral}</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}