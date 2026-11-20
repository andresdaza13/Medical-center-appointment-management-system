import { FormEvent, useEffect, useRef, useState } from 'react';
import { CitaDetalle } from '../core/types';
import { fechaLarga, hora12 } from './fechas';

const MIN = 10;
const MAX = 500;

/**
 * Pide la justificación antes de cancelar (RF6).
 *
 * Usa <dialog> nativo: con showModal() el navegador ya atrapa el foco, cierra
 * con Esc y bloquea el fondo. Es accesible sin escribir esa lógica a mano.
 */
export function ModalCancelarCita(props: {
  cita: CitaDetalle;
  onConfirmar: (justificacion: string) => Promise<void>;
  onCerrar: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const largo = texto.trim().length;
  const valido = largo >= MIN && largo <= MAX;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!valido) return;
    setEnviando(true);
    try {
      await props.onConfirmar(texto.trim());
    } finally {
      setEnviando(false);
    }
  };

  return (
    <dialog ref={ref} className="modal" onClose={props.onCerrar} aria-labelledby="titulo-cancelar">
      <form onSubmit={enviar}>
        <h2 id="titulo-cancelar">Cancelar cita</h2>
        <p>
          {fechaLarga(props.cita.fecha)} a las {hora12(props.cita.hora)} con {props.cita.medico.nombres}
        </p>
        <div className="campo">
          <label htmlFor="justificacion">¿Por qué cancela? (obligatorio)</label>
          <textarea
            id="justificacion"
            rows={4}
            maxLength={MAX}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            autoFocus
          />
          <small aria-live="polite">
            {largo < MIN ? `Escriba al menos ${MIN} caracteres (${largo}/${MIN})` : `${largo}/${MAX}`}
          </small>
        </div>
        <div className="modal-acciones">
          <button type="button" className="boton secundario" onClick={() => ref.current?.close()}>
            Volver
          </button>
          <button type="submit" className="boton peligro" disabled={!valido || enviando}>
            {enviando ? 'Cancelando…' : 'Cancelar cita'}
          </button>
        </div>
      </form>
    </dialog>
  );
}