import { Controller, Get } from '@nestjs/common';
import { UsuarioAutenticado } from '../domain/usuario-autenticado';
import { UsuarioActual } from './decorators';

/**
 * El login ya no vive aquí: lo hace Keycloak (OpenID Connect).
 * Este endpoint solo informa quién es el usuario según su token.
 */
@Controller('auth')
export class AuthController {
  @Get('perfil')
  perfil(@UsuarioActual() usuario: UsuarioAutenticado) {
    return {
      id: usuario.id,
      username: usuario.username,
      nombreCompleto: usuario.nombreCompleto,
      email: usuario.email,
      roles: usuario.roles,
    };
  }
}
