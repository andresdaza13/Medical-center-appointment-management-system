import { FormEvent, useState } from 'react';
import { Genero, NuevoPaciente } from '../../core/types';
import { Alerta } from '../../shared/components';
import { hoyIso } from '../../shared/fechas';
import { mensajeDe } from '../../shared/hooks';

/**
 * Formulario de datos del paciente, reutilizado por:
 *  - el paciente al completar su perfil la primera vez, y
 *  - el personal al registrar un paciente nuevo.
 * Las mismas reglas que valida el backend se anticipan aquí (pattern, required)
 * para dar retroalimentación inmediata, pero la validación REAL es la del servidor.
 */
export function FormularioPaciente(props: {
  textoBoton: string;
  correoInicial?: string;
  onGuardar: (datos: NuevoPaciente) => Promise<void>;
}) {
  const [datos, setDatos] = useState<NuevoPaciente>({
    documento: '',
    nombres: '',
    apellidos: '',
    celular: '',
    genero: 'MUJER',
    fechaNacimiento: '',
    email: props.correoInicial ?? '',
  });
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const campo = (k: keyof NuevoPaciente) => ({
    id: `pac-${k}`,
    value: datos[k] ?? '',
    onChange: (e: { target: { value: string } }) => setDatos({ ...datos, [k]: e.target.value }),
  });

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      await props.onGuardar({
        ...datos,
        fechaNacimiento: datos.fechaNacimiento || undefined,
        email: datos.email || undefined,
      });
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <form className="tarjeta formulario" onSubmit={enviar}>
      <div className="campo">
        <label htmlFor="pac-documento">Número de cédula *</label>
        <input {...campo('documento')} required inputMode="numeric" pattern="\d{5,12}" title="Entre 5 y 12 dígitos" />
      </div>
      <div className="campo">
        <label htmlFor="pac-nombres">Nombres *</label>
        <input {...campo('nombres')} required maxLength={80} />
      </div>
      <div className="campo">
        <label htmlFor="pac-apellidos">Apellidos *</label>
        <input {...campo('apellidos')} required maxLength={80} />
      </div>
      <div className="campo">
        <label htmlFor="pac-celular">Celular *</label>
        <input {...campo('celular')} required inputMode="tel" pattern="3\d{9}" title="10 dígitos, inicia en 3" />
      </div>
      <div className="campo">
        <label htmlFor="pac-genero">Género *</label>
        <select {...campo('genero')} onChange={(e) => setDatos({ ...datos, genero: e.target.value as Genero })}>
          <option value="MUJER">Mujer</option>
          <option value="HOMBRE">Hombre</option>
          <option value="OTRO">Otro</option>
        </select>
      </div>
      <div className="campo">
        <label htmlFor="pac-fechaNacimiento">Fecha de nacimiento</label>
        <input {...campo('fechaNacimiento')} type="date" max={hoyIso()} />
      </div>
      <div className="campo">
        <label htmlFor="pac-email">Correo electrónico</label>
        <input {...campo('email')} type="email" maxLength={120} />
      </div>
      <Alerta tipo="error">{error}</Alerta>
      <button className="boton grande" disabled={enviando}>
        {enviando ? 'Guardando…' : props.textoBoton}
      </button>
    </form>
  );
}
