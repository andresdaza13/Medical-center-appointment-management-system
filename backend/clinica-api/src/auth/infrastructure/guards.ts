import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Rol } from '../domain/rol';
import { UsuarioAutenticado } from '../domain/usuario-autenticado';
import { ES_PUBLICO, ROLES_PERMITIDOS } from './decorators';

/*
 * CADENA DE RESPONSABILIDAD (Chain of Responsibility, GoF).
 *
 * Cada petición atraviesa una cadena de guards registrados globalmente en
 * AppModule, en este orden:
 *
 *   ThrottlerGuard → JwtAuthGuard → RolesGuard → Controlador
 *
 * Cada eslabón decide si deja pasar la petición al siguiente o la corta
 * (429, 401 o 403). Ningún guard conoce a los demás: se pueden agregar,
 * quitar o reordenar sin modificarlos.
 */

/** Eslabón 2: ¿la petición trae un token válido de Keycloak? (401 si no). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('keycloak') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const esPublico = this.reflector.getAllAndOverride<boolean>(ES_PUBLICO, [
      context.getHandler(),
      context.getClass(),
    ]);
    return esPublico ? true : super.canActivate(context);
  }
}

/** Eslabón 3: ¿el usuario tiene alguno de los roles que pide el endpoint? (403 si no). */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requeridos = this.reflector.getAllAndOverride<Rol[] | undefined>(ROLES_PERMITIDOS, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requeridos || requeridos.length === 0) {
      return true; // basta con estar autenticado
    }

    const usuario: UsuarioAutenticado | undefined = context.switchToHttp().getRequest().user;
    if (!usuario?.tieneRol(...requeridos)) {
      throw new ForbiddenException('Su rol no permite realizar esta operación');
    }
    return true;
  }
}
