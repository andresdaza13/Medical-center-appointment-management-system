import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './infrastructure/auth.controller';
import { JwtAuthGuard, RolesGuard } from './infrastructure/guards';
import { KeycloakClaimsAdapter } from './infrastructure/keycloak-claims.adapter';
import { KeycloakJwtStrategy } from './infrastructure/keycloak-jwt.strategy';

@Module({
  imports: [PassportModule],
  controllers: [AuthController],
  providers: [KeycloakClaimsAdapter, KeycloakJwtStrategy, JwtAuthGuard, RolesGuard],
  exports: [JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
