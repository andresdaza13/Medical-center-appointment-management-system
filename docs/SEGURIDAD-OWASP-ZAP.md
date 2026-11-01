# Pruebas de seguridad con OWASP ZAP (RNF 2)

Objetivo del corte: **probar al menos dos vulnerabilidades del OWASP Top 10 (2021)** y entregar un informe breve.
Esta guía propone cuatro pruebas: dos automáticas con ZAP y dos manuales dirigidas que demuestran los controles del diseño.

> ⚠️ Hacking ético: escanee **solo** su propio entorno local. Nunca apunte ZAP a sistemas de terceros.

## 0. Preparación

1. Levante todo el sistema (ver README) y verifique que http://localhost:5173 funciona.
2. Instale ZAP: https://www.zaproxy.org/download/
3. Obtenga un token de `agendador1` con la colección de Postman (`docs/piedrazul.postman_collection.json`, petición *"1. Token de usuario"*). Copie el `access_token`.
   *Nota:* dura 5 minutos; si el escaneo es largo, renuévelo.

## Prueba 1 · A05 Security Misconfiguration (escaneo pasivo + activo)

**Hipótesis:** la API podría exponer cabeceras inseguras o información del servidor.

1. En ZAP: *Automated Scan* → URL `http://localhost:3000/api/medicos` → *Attack*.
2. Para escanear autenticado: *Tools → Options → Replacer → Add*:
   - Match type: `Request Header (will add if not present)`
   - Match string: `Authorization`
   - Replacement: `Bearer <token>`
3. Repita el escaneo sobre `http://localhost:5173`.

**Qué esperar y cómo interpretarlo:**

| Alerta típica | Antes (corte 1) | Ahora |
|---|---|---|
| X-Content-Type-Options header missing | Presente | Corregida por `helmet()` en `main.ts` |
| Missing Anti-clickjacking Header | Presente | Corregida (`X-Frame-Options: SAMEORIGIN`) |
| Server Leaks Information via "X-Powered-By" | `X-Powered-By: Express` | Eliminada por `helmet()` |
| CSP header not set (frontend en `vite dev`) | Presente | **Esperada en desarrollo**: el servidor de Vite no envía CSP. En producción se configura en el servidor web. Documéntela como riesgo aceptado. |

Exporte el reporte: *Report → Generate Report → HTML*.

## Prueba 2 · A01 Broken Access Control (manual, con ZAP como proxy o Postman)

**Hipótesis:** un usuario podría acceder a funciones o datos que no le corresponden.

| # | Petición | Token usado | Resultado esperado |
|---|---|---|---|
| 2.1 | `GET /api/citas?medicoId=1&fecha=2026-11-04` | *ninguno* | **401** |
| 2.2 | `GET /api/citas?medicoId=1&fecha=2026-11-04` | token manipulado (cambie un carácter de la firma) | **401** |
| 2.3 | `PUT /api/configuracion` `{"ventanaSemanas":26}` | `paciente1` | **403** |
| 2.4 | `GET /api/citas/historial?documento=1061000001` | `paciente1` | **403** |
| 2.5 | `PATCH /api/citas/{id-de-cita-ajena}/cancelar` | `paciente1` | **403** "Solo puede cancelar sus propias citas" |
| 2.6 | `POST /api/citas` con `"pacienteId": <otro>` | `paciente1` | **201**, pero la cita queda a nombre de `paciente1` (el id del body se ignora) |

En ZAP puede hacerlo con *Manual Request Editor* (Ctrl+M) o reenviando una petición capturada.

## Prueba 3 · A03 Injection / Mass Assignment (fuzzing de entrada)

**Hipótesis:** campos inesperados o maliciosos podrían alterar datos.

1. Capture en ZAP un `POST /api/pacientes` hecho desde la app.
2. Clic derecho → *Fuzz…* sobre el campo `documento` con la lista *"SQL Injection"* de ZAP.
   **Esperado:** 400 en todos los casos (el DTO exige `^\d{5,12}$`; además Prisma usa consultas parametrizadas).
3. Reenvíe el cuerpo agregando `"keycloakId":"robado"` o `"id":1`.
   **Esperado:** 400 *"property keycloakId should not exist"* (`forbidNonWhitelisted`).

## Prueba 4 · CSV Injection (A03, específica de RF4)

1. Registre un paciente con nombres `=HYPERLINK("http://evil.test","clic")`.
   (El formulario lo permite: es texto válido para un nombre).
2. Agéndele una cita y exporte la agenda en CSV. Ábrala en Excel.
   **Esperado:** la celda muestra el texto literal con un apóstrofo inicial; no se ejecuta como fórmula (`CsvExportador.escapar`).

---

## Plantilla de informe (1–2 páginas)

```
INFORME DE PRUEBAS DE SEGURIDAD – PIEDRAZUL – Segundo corte
Fecha: ____   Herramienta: OWASP ZAP versión ____   Alcance: localhost (API :3000, SPA :5173)

1. Resumen ejecutivo
   Se ejecutaron N pruebas sobre 2+ categorías del OWASP Top 10 2021.
   Hallazgos: X altos, Y medios, Z bajos/informativos. Corregidos: __.

2. Hallazgos
   | ID | Categoría OWASP | Descripción | Riesgo | Evidencia | Estado |
   | H1 | A05 | Falta X-Content-Type-Options | Bajo | captura ZAP | Corregido (helmet) |
   | H2 | A01 | ...                           | ...  | ...         | ...                |

3. Pruebas de control de acceso (tabla de la Prueba 2 con el código obtenido)

4. Riesgos aceptados
   - CSP ausente en servidor de desarrollo Vite (se configura en producción).
   - Keycloak en modo start-dev sin HTTPS (solo entorno local).

5. Conclusiones y recomendaciones
```
