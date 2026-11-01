/** Fecha de hoy en formato AAAA-MM-DD según la hora local del navegador. */
export function hoyIso(): string {
  return new Date().toLocaleDateString('en-CA');
}

/** "2026-11-04" → "miércoles, 4 de noviembre de 2026" (sin desfase de zona horaria). */
export function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  return new Date(a, m - 1, d).toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/** "14:20" → "2:20 p. m." (más familiar para los usuarios de Piedrazul). */
export function hora12(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' });
}
