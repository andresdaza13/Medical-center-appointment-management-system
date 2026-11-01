# Guía de estudio y transcripción

El código está ordenado para que cada fase **compile y se pueda probar sola**.
Transcriba en este orden y, al terminar cada fase, ejecute lo indicado y haga un commit.
Las pruebas (`*.spec.ts`) le dicen si lo que escribió se comporta igual que el original.

> Consejo: no copie los comentarios a ciegas. Léalos, entiéndalos y escríbalos con sus palabras.
> En la sustentación le preguntarán *por qué*, no *qué*.

## Fase 0 · Infraestructura (30 min)
| Archivo | Qué aprender |
|---|---|
| `docker-compose.yml`, `.env.example`, `.gitignore` | Configuración externa: ningún secreto en Git |
| `infra/keycloak/piedrazul-realm.json` | Realm, roles, clientes públicos, PKCE, audiencia |
| `backend/clinica-api/prisma/schema.prisma` | Enums, índices, y el truco de `activa` + `@@unique` (ADR-04) |

✅ `docker compose up -d` → entre a http://localhost:8080 y vea el realm *piedrazul*.
✅ `npx prisma migrate dev --name init`

## Fase 1 · Núcleo compartido (45 min)
`src/shared/domain/errors.ts` → `fecha-calendario.ts` → `hora-del-dia.ts` → `shared/application/reloj.port.ts` → `shared/infrastructure/*` → `shared.module.ts`

Conceptos: Value Object, errores de dominio vs HTTP, puerto + token de inyección.
✅ `npx jest shared`

## Fase 2 · Seguridad con Keycloak (1 h)
`src/auth/domain/*` → `infrastructure/keycloak-claims.adapter.ts` → `keycloak-jwt.strategy.ts` → `decorators.ts` → `guards.ts` → `auth.controller.ts` → `auth.module.ts`

Conceptos: Adapter, JWKS y firmas RS256, Chain of Responsibility con guards, seguridad cerrada por defecto.
✅ `npx jest auth`

## Fase 3 · Médicos y configuración (1 h 30 min) — RF3
`medicos/domain/*` → `medicos/application/*` → `medicos/infrastructure/*` → `medicos.module.ts`, y lo mismo con `configuracion/`.

Conceptos: entidad vs value object, agregado, Repository, DTO de entrada y salida, por qué "desactivar" en vez de borrar.
✅ `npx jest medicos configuracion`

## Fase 4 · Pacientes (1 h) — RF5 (autocompletado)
Mismo orden de capas en `pacientes/`.
Conceptos: invariantes en la entidad, vincular la cuenta de Keycloak, minimizar datos expuestos.
✅ `npx jest pacientes`

## Fase 5 · Citas (2 h 30 min) — RF1, RF2, RF5 — **el corazón del sistema**
1. `citas/domain/cita.ts`, `cita.repository.ts`, `cita-consultas.ts`
2. `citas/domain/calculadora-disponibilidad.ts`
3. `citas/domain/reglas/regla-agendamiento.ts` → `reglas.ts`  ← **Chain of Responsibility + Template Method**
4. `citas/application/*` (tres servicios)
5. `citas/infrastructure/*` y `citas.module.ts`

Conceptos: ciclo de vida de una entidad, CQRS ligero, servicio de dominio, condición de carrera.
✅ `npx jest citas`

## Fase 6 · Exportación (1 h) — RF4
`exportador.ts` → `exportador-tabular.ts` → `csv.exportador.ts` → `texto-plano.exportador.ts` → `fabrica-exportadores.ts` → servicio → controlador → módulo.
Conceptos: **Strategy, Template Method, Factory**, RFC 4180 y CSV Injection.
✅ `npx jest exportacion`

## Fase 7 · Arranque (20 min)
`config/env.validation.ts` → `app.module.ts` → `main.ts` → `prisma/seed.ts` → `src/testing/dobles.ts`
✅ `npm test` (las 125 pruebas) y `npm run start:dev`

## Fase 8 · Frontend (3 h)
1. `core/config.ts`, `core/types.ts`
2. `core/auth/keycloak.ts` → `AuthContext.tsx`
3. `core/http/api-client.ts` (**Singleton**) → `api.ts` (**Facade**)
4. `shared/hooks.ts`, `fechas.ts`, `components.tsx`
5. `features/*` (una pantalla por requisito)
6. `app/Layout.tsx` → `app/App.tsx` → `main.tsx` → `styles.css`

✅ `npm run build` sin errores; inicie sesión con cada usuario de prueba.

## Fase 9 · Seguridad y documentación
Siga `docs/SEGURIDAD-OWASP-ZAP.md` y complete el informe. Use `docs/ARQUITECTURA.md` como base del documento PDF.

---

## Reparto sugerido para el equipo (commits de todos)
La rúbrica revisa que **todos** tengan commits. Un reparto natural por módulos:

| Integrante | Fases | Rama sugerida |
|---|---|---|
| A | 0, 1, 2 (infraestructura y seguridad) | `feature/keycloak` |
| B | 3, 4 (médicos, configuración, pacientes) | `feature/rf3-rf5` |
| C | 5 (citas) | `feature/citas` |
| D | 6 + informe ZAP | `feature/rf4-exportacion` |
| E / todos | 8 (cada uno la pantalla de su módulo) | `feature/front-*` |

Mensajes de commit en estilo *Conventional Commits*:
`feat(citas): cadena de reglas de agendamiento`, `test(exportacion): csv injection`, `docs: escenarios de calidad`.

## Preguntas de autoevaluación
1. ¿Por qué `TurnoLibreRegla` no basta para evitar citas duplicadas? ¿Qué lo garantiza?
2. ¿Qué tendría que cambiar para exportar a PDF? ¿Y qué **no** cambia?
3. ¿Por qué el paciente no puede elegir el `pacienteId` al agendar? ¿Qué categoría OWASP evita esto?
4. Si mañana cambian Keycloak por Auth0, ¿qué archivos se tocan?
5. ¿Por qué `FechaCalendario` y no `Date`?
6. ¿Qué diferencia hay entre `CitaRepository` y `CitaConsultas`? ¿Qué principio SOLID aplica?
