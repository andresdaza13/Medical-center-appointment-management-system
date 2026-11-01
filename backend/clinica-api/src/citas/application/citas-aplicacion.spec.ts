import { ConfiguracionService } from '../../configuracion/application/configuracion.service';
import { MedicosService } from '../../medicos/application/medicos.service';
import { Especialidad } from '../../medicos/domain/medico';
import { PacientesService } from '../../pacientes/application/pacientes.service';
import {
  AccesoDenegadoError,
  ConflictoError,
  DatoInvalidoError,
  RecursoNoEncontradoError,
  ReglaNegocioError,
} from '../../shared/domain/errors';
import {
  CitaConsultasEnMemoria,
  CitaRepositoryEnMemoria,
  ConfiguracionRepositoryEnMemoria,
  MedicoRepositoryEnMemoria,
  PacienteRepositoryEnMemoria,
  RelojFijo,
  unaCitaDetalle,
  unHorario,
  unMedico,
  unPaciente,
  usuarioAgendador,
  usuarioPaciente,
} from '../../testing/dobles';
import { EstadoCita } from '../domain/cita';
import { AgendarCitaService } from './agendar-cita.service';
import { ConsultarCitasService } from './consultar-citas.service';
import { DisponibilidadService } from './disponibilidad.service';

/** Arma el "mundo" de cada prueba con repositorios en memoria. */
function escenario() {
  const reloj = new RelojFijo(); // lunes 2026-11-02 06:00
  const citas = new CitaRepositoryEnMemoria();
  const medicosRepo = new MedicoRepositoryEnMemoria();
  const pacientesRepo = new PacienteRepositoryEnMemoria();
  const configRepo = new ConfiguracionRepositoryEnMemoria();
  const consultas = new CitaConsultasEnMemoria();

  medicosRepo.datos.push(
    unMedico(1), // L-M-V 07:00–08:00 cada 20 min, terapia neural
    unMedico(2, { especialidad: Especialidad.FISIOTERAPIA, horario: unHorario({ dias: [2], inicio: '09:00', fin: '10:00', intervalo: 30 }) }),
  );
  pacientesRepo.datos.push(unPaciente(10, '1061000001', 'kc-paciente'), unPaciente(11, '1061000002'));

  const medicos = new MedicosService(medicosRepo);
  const pacientes = new PacientesService(pacientesRepo, reloj);
  const configuracion = new ConfiguracionService(configRepo);

  return {
    reloj,
    citas,
    consultas,
    agendar: new AgendarCitaService(citas, medicos, pacientes, configuracion, reloj),
    disponibilidad: new DisponibilidadService(citas, medicos, configuracion, reloj),
    consultar: new ConsultarCitasService(consultas, medicos, pacientes, reloj),
  };
}

describe('AgendarCitaService', () => {
  it('RF2: un paciente agenda su propia cita; el pacienteId sale de su token', async () => {
    const { agendar } = escenario();
    // Intenta agendar a nombre de otro paciente (11): se ignora.
    const cita = await agendar.agendar(usuarioPaciente(), { medicoId: 1, fecha: '2026-11-04', hora: '07:20', pacienteId: 11 });
    expect(cita.pacienteId).toBe(10);
    expect(cita.creadoPor).toBe('paciente1');
    expect(cita.estado).toBe(EstadoCita.AGENDADA);
  });

  it('un paciente sin perfil no puede agendar', async () => {
    const { agendar } = escenario();
    await expect(
      agendar.agendar(usuarioPaciente('kc-sin-perfil'), { medicoId: 1, fecha: '2026-11-04', hora: '07:20' }),
    ).rejects.toThrow(RecursoNoEncontradoError);
  });

  it('agendamiento manual: el personal debe indicar el paciente', async () => {
    const { agendar } = escenario();
    await expect(agendar.agendar(usuarioAgendador(), { medicoId: 1, fecha: '2026-11-04', hora: '07:20' })).rejects.toThrow(
      DatoInvalidoError,
    );
    const cita = await agendar.agendar(usuarioAgendador(), { medicoId: 1, fecha: '2026-11-04', hora: '07:20', pacienteId: 11 });
    expect(cita.pacienteId).toBe(11);
  });

  it('aplica la cadena de reglas (día que no atiende)', async () => {
    const { agendar } = escenario();
    await expect(agendar.agendar(usuarioPaciente(), { medicoId: 1, fecha: '2026-11-03', hora: '07:20' })).rejects.toThrow(
      ReglaNegocioError,
    );
  });

  it('RNF4: el segundo que pide el mismo turno recibe conflicto', async () => {
    const { agendar } = escenario();
    await agendar.agendar(usuarioAgendador(), { medicoId: 1, fecha: '2026-11-04', hora: '07:20', pacienteId: 11 });
    await expect(agendar.agendar(usuarioPaciente(), { medicoId: 1, fecha: '2026-11-04', hora: '07:20' })).rejects.toThrow(
      ConflictoError,
    );
  });

  it('RNF4: si dos peticiones pasan la validación a la vez, la restricción única detiene a una', async () => {
    const { agendar, citas } = escenario();
    const resultados = await Promise.allSettled([
      agendar.agendar(usuarioPaciente(), { medicoId: 1, fecha: '2026-11-04', hora: '07:40' }),
      agendar.agendar(usuarioAgendador(), { medicoId: 1, fecha: '2026-11-04', hora: '07:40', pacienteId: 11 }),
    ]);
    expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(resultados.filter((r) => r.status === 'rejected')).toHaveLength(1);
    expect(citas.datos.filter((c) => c.hora.toString() === '07:40')).toHaveLength(1);
  });

  describe('cancelar', () => {
    it('el paciente cancela su cita y el turno queda libre otra vez', async () => {
      const { agendar, citas } = escenario();
      const cita = citas.sembrar(1, 10, '2026-11-04', '07:00');
      await agendar.cancelar(usuarioPaciente(), cita.id!);
      expect(cita.estado).toBe(EstadoCita.CANCELADA);
      await expect(
        agendar.agendar(usuarioAgendador(), { medicoId: 1, fecha: '2026-11-04', hora: '07:00', pacienteId: 11 }),
      ).resolves.toBeDefined();
    });

    it('OWASP A01: un paciente NO puede cancelar la cita de otro', async () => {
      const { agendar, citas } = escenario();
      const ajena = citas.sembrar(1, 11, '2026-11-04', '07:00');
      await expect(agendar.cancelar(usuarioPaciente(), ajena.id!)).rejects.toThrow(AccesoDenegadoError);
    });

    it('falla si la cita no existe', async () => {
      const { agendar } = escenario();
      await expect(agendar.cancelar(usuarioAgendador(), 12345)).rejects.toThrow(RecursoNoEncontradoError);
    });
  });
});

describe('DisponibilidadService', () => {
  it('franjasDelDia excluye las ocupadas', async () => {
    const { disponibilidad, citas } = escenario();
    citas.sembrar(1, 10, '2026-11-04', '07:00');
    const franjas = await disponibilidad.franjasDelDia(1, '2026-11-04');
    expect(franjas.map((f) => String(f.hora))).toEqual(['07:20', '07:40']);
  });

  it('sugerencias por especialidad devuelve la más cercana primero', async () => {
    const { disponibilidad } = escenario();
    const s = await disponibilidad.sugerencias({ especialidad: Especialidad.FISIOTERAPIA }, 3);
    expect(s.map((x) => `${x.medico.id} ${x.franja.fecha} ${x.franja.hora}`)).toEqual([
      '2 2026-11-03 09:00',
      '2 2026-11-03 09:30',
      '2 2026-11-10 09:00',
    ]);
  });

  it('sugerencias sin filtro mezcla médicos ordenando por fecha y hora', async () => {
    const { disponibilidad } = escenario();
    const s = await disponibilidad.sugerencias({}, 4);
    expect(s.map((x) => `${x.medico.id} ${x.franja.fecha} ${x.franja.hora}`)).toEqual([
      '1 2026-11-02 07:00',
      '1 2026-11-02 07:20',
      '1 2026-11-02 07:40',
      '2 2026-11-03 09:00',
    ]);
  });
});

describe('ConsultarCitasService', () => {
  it('RF1: agenda del día con total y edad calculada', async () => {
    const { consultar, consultas } = escenario();
    consultas.resultado.push(unaCitaDetalle({ id: 1 }), unaCitaDetalle({ id: 2, hora: '07:20' }), unaCitaDetalle({ id: 3, fecha: '2026-11-06' }));
    const agenda = await consultar.agendaDelDia(1, '2026-11-04');
    expect(agenda.total).toBe(2);
    expect(agenda.medico.nombres).toBe('Médico 1');
    expect(agenda.citas[0].paciente.edad).toBe(68);
  });

  it('RF1: falla si el médico no existe', async () => {
    const { consultar } = escenario();
    await expect(consultar.agendaDelDia(99, '2026-11-04')).rejects.toThrow(RecursoNoEncontradoError);
  });

  it('RF5: historial por cédula', async () => {
    const { consultar, consultas } = escenario();
    consultas.resultado.push(unaCitaDetalle({ id: 1 }), unaCitaDetalle({ id: 2, fecha: '2026-10-01' }));
    const historial = await consultar.historialPorDocumento('1061000001');
    expect(historial.paciente.documento).toBe('1061000001');
    expect(historial.total).toBe(2);
  });

  it('RF5: falla con una cédula que no existe', async () => {
    const { consultar } = escenario();
    await expect(consultar.historialPorDocumento('999999')).rejects.toThrow(RecursoNoEncontradoError);
  });

  it('misCitas devuelve solo las del paciente autenticado', async () => {
    const { consultar, consultas } = escenario();
    consultas.resultado.push(
      unaCitaDetalle({ id: 1 }),
      unaCitaDetalle({ id: 2, paciente: { id: 11, documento: '1061000002', nombreCompleto: 'Otro', celular: '3000000000' } }),
    );
    expect((await consultar.misCitas(usuarioPaciente())).map((c) => c.id)).toEqual([1]);
  });
});
