import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Rol } from './domain/rol';
import { UsuarioAutenticado } from './domain/usuario-autenticado';
import { ROLES_PERMITIDOS } from './infrastructure/decorators';
import { RolesGuard } from './infrastructure/guards';
import { KeycloakClaimsAdapter } from './infrastructure/keycloak-claims.adapter';

describe('KeycloakClaimsAdapter (Adapter)', () => {
  const adapter = new KeycloakClaimsAdapter();

  it('convierte el payload de Keycloak en un usuario del dominio', () => {
    const usuario = adapter.adaptar({
      sub: 'uuid-123',
      preferred_username: 'medico1',
      email: 'medico1@piedrazul.test',
      name: 'Clara Córdoba',
      realm_access: { roles: ['offline_access', 'default-roles-piedrazul', 'medico'] },
    });
    expect(usuario.id).toBe('uuid-123');
    expect(usuario.username).toBe('medico1');
    expect(usuario.roles).toEqual([Rol.MEDICO]); // descarta los roles técnicos
    expect(usuario.esPersonal()).toBe(true);
  });

  it('tolera un token sin roles', () => {
    const usuario = adapter.adaptar({ sub: 'x' });
    expect(usuario.roles).toEqual([]);
    expect(usuario.username).toBe('x');
  });
});

describe('UsuarioAutenticado', () => {
  it('un paciente no es personal', () => {
    expect(new UsuarioAutenticado('1', 'p', [Rol.PACIENTE]).esPersonal()).toBe(false);
  });
});

describe('RolesGuard (eslabón de la cadena de guards)', () => {
  function contexto(roles: Rol[] | undefined, usuario?: UsuarioAutenticado): [RolesGuard, ExecutionContext] {
    const reflector = { getAllAndOverride: jest.fn((clave: string) => (clave === ROLES_PERMITIDOS ? roles : undefined)) };
    const ctx = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => ({ user: usuario }) }),
    } as unknown as ExecutionContext;
    return [new RolesGuard(reflector as unknown as Reflector), ctx];
  }

  it('deja pasar si el endpoint no exige roles', () => {
    const [guard, ctx] = contexto(undefined, new UsuarioAutenticado('1', 'p', [Rol.PACIENTE]));
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('deja pasar si el usuario tiene alguno de los roles', () => {
    const [guard, ctx] = contexto([Rol.MEDICO, Rol.AGENDADOR], new UsuarioAutenticado('1', 'a', [Rol.AGENDADOR]));
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('responde 403 si no tiene el rol', () => {
    const [guard, ctx] = contexto([Rol.ADMINISTRADOR], new UsuarioAutenticado('1', 'p', [Rol.PACIENTE]));
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
