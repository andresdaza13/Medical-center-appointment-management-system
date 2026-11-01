import { DatoInvalidoError, RecursoNoEncontradoError } from '../../shared/domain/errors';
import { MedicoRepositoryEnMemoria, unMedico } from '../../testing/medicos.dobles';
import { Especialidad, TipoProfesional } from '../domain/medico';
import { MedicosService } from './medicos.service';

describe('MedicosService', () => {
  let repo: MedicoRepositoryEnMemoria;
  let service: MedicosService;

  beforeEach(() => {
    repo = new MedicoRepositoryEnMemoria();
    service = new MedicosService(repo);
  });

  it('registra un profesional', async () => {
    const m = await service.registrar({ nombres: 'Armando Peña', tipo: TipoProfesional.TERAPISTA, especialidad: Especialidad.FISIOTERAPIA });
    expect(m.id).toBe(1);
    expect(await service.listar()).toHaveLength(1);
  });

  it('lanza RecursoNoEncontradoError si el médico no existe', async () => {
    await expect(service.obtener(99)).rejects.toThrow(RecursoNoEncontradoError);
  });

  it('actualiza los datos del profesional', async () => {
    repo.datos.push(unMedico(1));
    const m = await service.actualizar(1, { nombres: 'Nuevo Nombre', tipo: TipoProfesional.TERAPISTA, especialidad: Especialidad.FISIOTERAPIA });
    expect(m.nombres).toBe('Nuevo Nombre');
    expect(m.tipo).toBe(TipoProfesional.TERAPISTA);
  });

  it('desactiva en lugar de borrar, y filtra en el listado de activos', async () => {
    repo.datos.push(unMedico(1), unMedico(2));
    await service.cambiarEstado(1, false);
    expect((await service.listar({ soloActivos: true })).map((m) => m.id)).toEqual([2]);
    await service.cambiarEstado(1, true);
    expect(await service.listar({ soloActivos: true })).toHaveLength(2);
  });

  it('configura el horario (RF3)', async () => {
    repo.datos.push(unMedico(1, { horario: null }));
    const m = await service.configurarHorario(1, { diasAtencion: [1, 2], horaInicio: '07:00', horaFin: '09:00', intervaloMinutos: 15 });
    expect(m.horario?.franjas()).toHaveLength(8);
    expect(m.estaDisponibleParaAgendar()).toBe(true);
  });

  it('rechaza un horario inválido sin modificar el anterior', async () => {
    const medico = unMedico(1);
    const anterior = medico.horario;
    repo.datos.push(medico);
    await expect(
      service.configurarHorario(1, { diasAtencion: [1], horaInicio: '10:00', horaFin: '08:00', intervaloMinutos: 15 }),
    ).rejects.toThrow(DatoInvalidoError);
    expect(medico.horario).toBe(anterior);
  });
});
