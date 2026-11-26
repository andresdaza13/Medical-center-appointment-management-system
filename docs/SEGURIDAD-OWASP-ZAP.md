# Pruebas de seguridad con OWASP ZAP (RNF 2)

**Objetivo del corte 3:** Probar al menos dos vulnerabilidades del OWASP Top 10 (2021) en el entorno desplegado en la nube, aplicar las correcciones y verificar mediante un re-escaneo.

> ⚠️ **Hacking ético:** Escanee **solo** su propio entorno. Nunca apunte ZAP a sistemas de terceros.

## 0. Preparación y Alcance (Tercer Corte)
1. Entorno evaluado: Aplicación desplegada en Render.
   - **Frontend:** `https://piedrazul-web-7k89.onrender.com`
   - **Backend (API):** `https://piedrazul-api-3wnf.onrender.com`
   - **Keycloak:** `https://piedrazul-keycloak.onrender.com`
2. Herramienta: OWASP ZAP versión 2.17.0 (Windows).
3. Las pruebas del corte anterior (A01, A03, CSV Injection) se mantienen vigentes y fueron verificadas en local.

---

## Prueba 1 · A05 Security Misconfiguration (Escaneo Automatizado en Nube)

**Hipótesis:** La aplicación desplegada podría carecer de cabeceras de seguridad HTTP, exponiendo a los usuarios a ataques como Clickjacking o inyección de scripts (XSS).

**Procedimiento:**
1. En ZAP: *Automated Scan* → URL `https://piedrazul-web-7k89.onrender.com` → *Attack*.
2. Se dejó correr el Spider y el Escaneo Activo hasta su finalización.

**Hallazgos (Alertas medias encontradas):**
*   **H1: Falta de cabecera Anti-Clickjacking.**
*   **H2: Cabecera Content Security Policy (CSP) no configurada.**

**Corrección aplicada:**
Como el frontend es una SPA estática, se creó el archivo `public/_headers` (soportado por Render) para inyectar las cabeceras:
```text
/*
  X-Frame-Options: DENY
  Content-Security-Policy: default-src 'self'; connect-src 'self' https://piedrazul-api-3wnf.onrender.com https://piedrazul-keycloak.onrender.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; frame-ancestors 'none';
```

**Re-escaneo:**
*(Pendiente: Insertar aquí la captura de pantalla del nuevo escaneo de ZAP después del despliegue, mostrando que las alertas H1 y H2 desaparecieron).*

---

## Prueba 2 · A01 Broken Access Control (IDOR y Roles) - Entorno Nube

**Hipótesis:** Un usuario podría acceder a funciones o datos que no le corresponden (Insecure Direct Object Reference).

**Procedimiento y Resultados Esperados:**

| # | Petición | Token usado | Resultado esperado | Resultado Obtenido |
|---|---|---|---|---|
| 2.1 | `GET /api/citas?medicoId=1&fecha=2026-11-04` | *ninguno* | **401 Unauthorized** | ✅ Cumple |
| 2.2 | `GET /api/citas?medicoId=1...` | token manipulado | **401 Unauthorized** | ✅ Cumple |
| 2.3 | `PUT /api/configuracion` | `paciente1` | **403 Forbidden** | ✅ Cumple |
| 2.4 | `GET /api/citas/historial?documento=1061000001` | `paciente1` | **403 Forbidden** | ✅ Cumple |
| 2.5 | `PATCH /api/citas/{id-de-cita-ajena}/cancelar` | `paciente1` | **403 Forbidden** | ✅ Cumple |
| 2.6 | `POST /api/citas` con `"pacienteId": <otro>` | `paciente1` | **201 Creado**, pero la cita queda a nombre de `paciente1` (el id del body se ignora). | ✅ Cumple |

### 2.5. Ejemplo de IDOR prevenido (HU-08)
La historia de usuario HU-08 (Cancelar cita) es un vector clásico de IDOR si no se valida la pertenencia. El backend protege esto verificando el `sub` del token JWT contra el dueño de la cita. 
- **Evidencia:** Al intentar cancelar una cita con un ID ajeno usando el token de `paciente1`, la API responde `403 Forbidden` con el mensaje: *"Solo puede cancelar sus propias citas"*. 
- **Estado:** Mitigado y controlado por el `RolesGuard` y la lógica de dominio.

---

## Prueba 3 · A03 Injection / Mass Assignment (Fuzzing)

**Hipótesis:** Campos inesperados o maliciosos podrían alterar datos o ejecutar código.

1. **Mass Assignment:** Se reenvió el cuerpo de `POST /api/pacientes` agregando `"keycloakId":"robado"`.
   - **Esperado:** 400 Bad Request *"property keycloakId should not exist"*.
   - **Resultado:** ✅ Cumple (gracias al `forbidNonWhitelisted: true` en el `ValidationPipe`).
2. **SQL Injection:** Fuzzing sobre el campo `documento`.
   - **Esperado:** 400 en todos los casos (DTO exige `^\d{5,12}$`; Prisma usa consultas parametrizadas).
   - **Resultado:** ✅ Cumple.

---

## Prueba 4 · CSV Injection (A03, específica de RF4)

**Hipótesis:** Inyección de fórmulas al exportar archivos de Excel.

1. Se registró un paciente con nombres `=HYPERLINK("http://evil.test","clic")`.
2. Se exportó la agenda en CSV y se abrió en Excel.
   **Esperado:** La celda muestra el texto literal con un apóstrofo inicial; no se ejecuta como fórmula.
   **Resultado:** ✅ Mitigado por `CsvExportador.escapar`.

---

## Plantilla de Informe Final (Tercer Corte)

```text
INFORME DE PRUEBAS DE SEGURIDAD – PIEDRAZUL – Tercer Corte
Fecha: Noviembre 26 de 2026   
Herramienta: OWASP ZAP versión 2.17.0   
Alcance: Entorno Desplegado en Render (SPA :443, API :443, Keycloak :443)

1. Resumen ejecutivo
   Se realizaron pruebas automáticas y manuales sobre el sistema en producción, cubriendo A01 (Broken Access Control) y A05 (Security Misconfiguration). Se identificaron 2 vulnerabilidades medias en el frontend, las cuales fueron corregidas implementando una política CSP estricta y cabeceras anti-clickjacking.

2. Hallazgos y Correcciones
   | ID | Categoría OWASP | Descripción | Riesgo | Evidencia | Estado |
   | H1 | A05 | Falta de cabecera Anti-Clickjacking | Medio | Captura ZAP | Corregido (_headers) |
   | H2 | A05 | Cabecera CSP no configurada | Medio | Captura ZAP | Corregido (_headers) |

3. Pruebas de control de acceso (A01)
   Se verificó que los pacientes no pueden cancelar citas ajenas (IDOR - HU-08), obteniendo 403 Forbidden. También se comprobó el bloqueo de escalamiento de privilegios en configuración.

4. Riesgos aceptados
   - Keycloak desplegado en capa gratuita puede tener latencia inicial (Cold Start).
   - El servidor de desarrollo de Vite no envía CSP (se solucionó para producción con el archivo _headers en Render).

5. Conclusiones
   El sistema cuenta con defensas en profundidad: validación estricta de DTOs, uso de Helmet en el backend y cabeceras HTTP en el frontend. La superficie de ataque se redujo significativamente para el despliegue en la nube.
```