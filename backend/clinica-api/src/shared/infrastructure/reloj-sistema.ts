import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reloj } from '../application/reloj.port';
import { FechaCalendario } from '../domain/fecha-calendario';
import { HoraDelDia } from '../domain/hora-del-dia';

/**
 * ADAPTADOR del puerto Reloj usando el reloj del sistema operativo.
 *
 * El servidor puede estar en UTC (lo normal en la nube), pero "hoy" para
 * Piedrazul es hoy en Popayán. Por eso se calcula en APP_TIMEZONE.
 */
@Injectable()
export class RelojSistema implements Reloj {
  private readonly formato: Intl.DateTimeFormat;

  constructor(config: ConfigService) {
    this.formato = new Intl.DateTimeFormat('en-CA', {
      timeZone: config.get<string>('APP_TIMEZONE', 'America/Bogota'),
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
  }

  hoy(): FechaCalendario {
    const p = this.partes();
    return FechaCalendario.desde(`${p.year}-${p.month}-${p.day}`);
  }

  horaActual(): HoraDelDia {
    const p = this.partes();
    return HoraDelDia.desde(`${p.hour}:${p.minute}`);
  }

  private partes(): Record<string, string> {
    return Object.fromEntries(
      this.formato.formatToParts(new Date()).map((parte) => [parte.type, parte.value]),
    );
  }
}
