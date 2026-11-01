import { ConflictoError, RecursoNoEncontradoError } from '../../shared/domain/errors';
import { RelojFijo, usuarioPaciente } from '../../testing/base';
import { PacienteRepositoryEnMemoria, unPaciente } from '../../testing/pacientes.dobles';
import { Genero } from '../domain/paciente';
import { PacientesService, RegistrarPacienteCmd } from './pacientes.service';

const cmd = (cambios: Partial<RegistrarPacienteCmd> = {}): RegistrarPacienteCmd => ({
  documento: '1061000002',
  nombres: 'Héctor',
  apellidos: 'Bojorge',
  celular: '3109876543',
  genero: Genero.HOMBRE,
  fechaNacimiento: '1970-01-15',
  ...cambios,
});

describe('PacientesService', () => {
  let repo: PacienteRepositoryEnMemoria;
  let service: PacientesService;

  beforeEach(() => {
    repo = new PacienteRepositoryEnMemoria();
    service = new PacientesService(repo, new RelojFijo());
  });

  describe('registrar (personal)', () => {
    it('crea el paciente y le asigna id', async () => {
      const p = await service.registrar(cmd());
      expect(p.id).toBeDefined();
      expect(repo.datos).toHaveLength(1);
    });

    it('rechaza un documento ya registrado', async () => {
      await service.registrar(cmd());
      await expect(service.registrar(cmd())).rejects.toThrow(ConflictoError);
    });
  });

  describe('registrarPerfilPropio (paciente desde la web)', () => {
    it('crea el perfil vinculado al usuario de Keycloak', async () => {
      const p = await service.registrarPerfilPropio(usuarioPaciente('kc-9'), cmd());
      expect(p.keycloakId).toBe('kc-9');
    });

    it('vincula una ficha existente si el celular coincide (registrado antes por teléfono)', async () => {
      const existente = unPaciente(5, '1061000002');
      repo.datos.push(existente);
      const p = await service.registrarPerfilPropio(usuarioPaciente('kc-9'), cmd({ celular: '3001234567' }));
      expect(p).toBe(existente);
      expect(p.keycloakId).toBe('kc-9');
    });

    it('NO vincula una ficha existente si el celular no coincide (posible suplantación)', async () => {
      repo.datos.push(unPaciente(5, '1061000002'));
      await expect(service.registrarPerfilPropio(usuarioPaciente(), cmd({ celular: '3111111111' }))).rejects.toThrow(
        ConflictoError,
      );
    });

    it('no permite crear dos perfiles para la misma cuenta', async () => {
      await service.registrarPerfilPropio(usuarioPaciente('kc-9'), cmd());
      await expect(service.registrarPerfilPropio(usuarioPaciente('kc-9'), cmd({ documento: '99999' }))).rejects.toThrow(
        ConflictoError,
      );
    });
  });

  describe('consultas', () => {
    it('obtenerPerfilPropio falla si el usuario no ha completado su perfil', async () => {
      await expect(service.obtenerPerfilPropio(usuarioPaciente())).rejects.toThrow(RecursoNoEncontradoError);
    });

    it('obtenerPorDocumento falla si no existe', async () => {
      await expect(service.obtenerPorDocumento('123456')).rejects.toThrow(RecursoNoEncontradoError);
    });

    it('autocompletar devuelve coincidencias por prefijo', async () => {
      repo.datos.push(unPaciente(1, '1061000001'), unPaciente(2, '1061999999'), unPaciente(3, '2000000000'));
      const r = await service.autocompletar('1061');
      expect(r.map((p) => p.documento)).toEqual(['1061000001', '1061999999']);
    });

    it.each(['10', 'abc1', ''])('autocompletar no consulta con "%s" (muy corto o no numérico)', async (q) => {
      repo.datos.push(unPaciente(1, '1061000001'));
      expect(await service.autocompletar(q)).toEqual([]);
    });
  });
});
