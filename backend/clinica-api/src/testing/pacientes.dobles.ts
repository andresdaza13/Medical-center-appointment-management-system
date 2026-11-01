import { Genero, Paciente } from '../pacientes/domain/paciente';
import { PacienteRepository } from '../pacientes/domain/paciente.repository';
import { ConflictoError } from '../shared/domain/errors';

export function unPaciente(id = 10, documento = '1061000001', keycloakId?: string) {
  return Paciente.reconstituir(
    id,
    { documento, nombres: 'Lucy', apellidos: 'Chávez', celular: '3001234567', genero: Genero.MUJER },
    keycloakId,
  );
}

export class PacienteRepositoryEnMemoria implements PacienteRepository {
  readonly datos: Paciente[] = [];
  private siguienteId = 100;

  async buscarPorId(id: number) { return this.datos.find((p) => p.id === id) ?? null; }
  async buscarPorDocumento(doc: string) { return this.datos.find((p) => p.documento === doc) ?? null; }
  async buscarPorKeycloakId(kc: string) { return this.datos.find((p) => p.keycloakId === kc) ?? null; }
  async buscarPorPrefijoDocumento(prefijo: string, limite: number) {
    return this.datos.filter((p) => p.documento.startsWith(prefijo)).slice(0, limite);
  }
  async guardar(p: Paciente) {
    if (p.id === undefined) {
      if (this.datos.some((x) => x.documento === p.documento)) throw new ConflictoError('documento duplicado');
      p.asignarId(this.siguienteId++);
      this.datos.push(p);
    }
    return p;
  }
}

