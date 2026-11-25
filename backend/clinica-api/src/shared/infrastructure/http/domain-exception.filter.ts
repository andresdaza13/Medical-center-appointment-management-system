import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import {
  AccesoDenegadoError,
  ConflictoError,
  DatoInvalidoError,
  DomainError,
  RecursoNoEncontradoError,
  ReglaNegocioError,
} from '../../domain/errors';

/**
 * Traduce los errores del dominio a respuestas HTTP.
 *
 * Es el único lugar del sistema que conoce ambos mundos. Agregar un nuevo tipo
 * de error es agregar una entrada al mapa (OCP), sin tocar los controladores.
 */

// Tipo que representa cualquier clase que herede de DomainError
 
type ConstructorDeError = new (...args: any[]) => DomainError;

@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  private static readonly ESTADOS = new Map<ConstructorDeError, HttpStatus>([
    [RecursoNoEncontradoError, HttpStatus.NOT_FOUND],
    [DatoInvalidoError, HttpStatus.BAD_REQUEST],
    [ReglaNegocioError, HttpStatus.UNPROCESSABLE_ENTITY],
    [ConflictoError, HttpStatus.CONFLICT],
    [AccesoDenegadoError, HttpStatus.FORBIDDEN],
  ]);

  catch(error: DomainError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    
    // Al hacer el get, TypeScript ya sabe que error.constructor es un ConstructorDeError
    const status = DomainExceptionFilter.ESTADOS.get(error.constructor as ConstructorDeError) ?? HttpStatus.BAD_REQUEST;

    this.logger.debug(`${error.name}: ${error.message}`);
    response.status(status).json({
      statusCode: status,
      error: error.name,
      message: error.message,
    });
  }
}