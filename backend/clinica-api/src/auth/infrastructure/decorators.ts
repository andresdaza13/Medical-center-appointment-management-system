import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Rol } from '../domain/rol';
import { UsuarioAutenticado } from '../domain/usuario-autenticado';

export const ES_PUBLICO = 'esPublico';
export const ROLES_PERMITIDOS = 'rolesPermitidos';

/**
 * Marca un endpoint como público. La seguridad es "cerrada por defecto":
 * todo exige token salvo lo que se marque explícitamente con @Publico().
 */
export const Publico = () => SetMetadata(ES_PUBLICO, true);

/** Restringe un endpoint (o un controlador completo) a ciertos roles. */
export const Roles = (...roles: Rol[]) => SetMetadata(ROLES_PERMITIDOS, roles);

/** Inyecta en el parámetro el usuario autenticado: `@UsuarioActual() u: UsuarioAutenticado`. */
export const UsuarioActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioAutenticado =>
    ctx.switchToHttp().getRequest().user,
);
