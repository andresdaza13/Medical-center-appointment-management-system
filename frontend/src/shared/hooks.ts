import { DependencyList, useCallback, useEffect, useState } from 'react';
import { ApiError } from '../core/http/api-client';

/**
 * Retrasa la actualización de un valor hasta que el usuario deja de escribir.
 * Para el autocompletado: sin esto, escribir una cédula de 10 dígitos lanzaría
 * 10 peticiones al servidor; con debounce de 300 ms lanza una.
 */
export function useDebounce<T>(valor: T, ms = 300): T {
  const [retrasado, setRetrasado] = useState(valor);
  useEffect(() => {
    const t = setTimeout(() => setRetrasado(valor), ms);
    return () => clearTimeout(t);
  }, [valor, ms]);
  return retrasado;
}

/**
 * Carga datos asíncronos con estados de "cargando" y "error" uniformes.
 * Evita repetir el mismo trío de useState en cada pantalla.
 */
export function useCarga<T>(cargar: () => Promise<T>, deps: DependencyList) {
  const [datos, setDatos] = useState<T | undefined>(undefined);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const ejecutar = useCallback(cargar, deps);

  const recargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      setDatos(await ejecutar());
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      setCargando(false);
    }
  }, [ejecutar]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  return { datos, cargando, error, recargar, setDatos };
}

export function mensajeDe(e: unknown): string {
  if (e instanceof ApiError || e instanceof Error) return e.message;
  return 'Ocurrió un error inesperado';
}
