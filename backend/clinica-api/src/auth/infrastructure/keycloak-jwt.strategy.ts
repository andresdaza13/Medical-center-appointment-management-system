import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsuarioAutenticado } from '../domain/usuario-autenticado';
import { KeycloakClaimsAdapter, KeycloakTokenPayload } from './keycloak-claims.adapter';

/**
 * Verifica los access tokens emitidos por Keycloak.
 *
 * Antes: la API firmaba sus propios tokens con un secreto escrito en el código.
 * Ahora: la API NO conoce ningún secreto. Keycloak firma con su llave PRIVADA
 * (RS256) y publica la llave PÚBLICA en el endpoint JWKS. Esta estrategia la
 * descarga (con caché) y verifica:
 *   1. la firma           → el token lo emitió nuestro Keycloak,
 *   2. `iss` (issuer)     → del realm "piedrazul",
 *   3. `aud` (audience)   → emitido PARA esta API,
 *   4. `exp`              → no ha expirado.
 * Si algo falla, Passport responde 401 sin llegar al controlador.
 */
@Injectable()
export class KeycloakJwtStrategy extends PassportStrategy(Strategy, 'keycloak') {
  constructor(
    config: ConfigService,
    private readonly claimsAdapter: KeycloakClaimsAdapter,
  ) {
    const issuer = config.getOrThrow<string>('KEYCLOAK_ISSUER');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      issuer,
      audience: config.getOrThrow<string>('KEYCLOAK_AUDIENCE'),
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({
        jwksUri: `${issuer}/protocol/openid-connect/certs`,
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
      }),
    });
  }

  /** Lo que se retorna aquí queda en `request.user`. */
  validate(payload: KeycloakTokenPayload): UsuarioAutenticado {
    return this.claimsAdapter.adaptar(payload);
  }
}
