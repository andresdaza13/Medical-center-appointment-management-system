# Piedrazul · Sistema de agendamiento de citas médicas

Aplicación web (SPA + API) para la **Red de Servicios Médicos Piedrazul** (Popayán).
Proyecto de curso de Ingeniería de Software III, Universidad del Cauca, 2026-2.

| Capa | Tecnología |
|---|---|
| Frontend (SPA) | React 18 + TypeScript + Vite + React Router |
| Backend (monolito modular) | NestJS 10 + TypeScript |
| Persistencia | PostgreSQL 16 + Prisma ORM |
| Identidad (JWT) | Keycloak 26 (OpenID Connect, RS256) |
| Infraestructura local | Docker Compose |

📐 Arquitectura, decisiones y patrones: [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md)
🔐 Seguridad y pruebas con OWASP ZAP: [`docs/SEGURIDAD-OWASP-ZAP.md`](docs/SEGURIDAD-OWASP-ZAP.md)
✍️ Orden recomendado para estudiar/transcribir el código: [`docs/GUIA-DE-ESTUDIO.md`](docs/GUIA-DE-ESTUDIO.md)

---

## Requisitos implementados (segundo corte)

| # | Requisito | Dónde |
|---|---|---|
| RF1 | Listar citas de un médico en una fecha (filtros + tabla + total) | `GET /api/citas` · pantalla *Agenda del día* |
| RF2 | Paciente agenda por la web, viendo franjas disponibles y sugerencias | `POST /api/citas`, `GET /api/citas/disponibilidad`, `GET /api/citas/sugerencias` · *Agendar cita* |
| RF3 | Administrador configura ventana, días, franja e intervalo | `PUT /api/configuracion`, `PUT /api/medicos/:id/horario` · *Configuración* |
| RF4 | Exportar citas de un médico/fecha a CSV | `GET /api/exportaciones/agenda?formato=csv` · botón *Exportar CSV* |
| RF5 | Historial de citas de un paciente por cédula (+ autocompletado) | `GET /api/citas/historial`, `GET /api/pacientes/buscar` · *Historial por cédula* |
| RNF1 | Autenticación y autorización con JWT emitidos por Keycloak | `src/auth/**` · `infra/keycloak/` |
| RNF2 | Pruebas con OWASP ZAP (2+ vulnerabilidades del Top 10) | `docs/SEGURIDAD-OWASP-ZAP.md` |

## Puesta en marcha

Requisitos: Node.js 20+, Docker Desktop.

```bash
# 1. Infraestructura (PostgreSQL + Keycloak con el realm ya configurado)
cp .env.example .env                 # edite las contraseñas
docker compose up -d

# 2. Backend
cd backend/clinica-api
cp .env.example .env                 # use la misma clave de BD del paso 1
npm install                          # también ejecuta "prisma generate"
npx prisma migrate dev --name init   # crea las tablas
npx prisma db seed                   # médicos y paciente de prueba
npm run start:dev                    # http://localhost:3000/api

# 3. Frontend (otra terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                          # http://localhost:5173
```

### Usuarios de prueba (solo desarrollo)

Contraseña de todos: `Piedrazul2026`

| Usuario | Rol | Qué puede hacer |
|---|---|---|
| `admin.piedrazul` | administrador | Configuración (RF3) + todo lo del personal |
| `agendador1` | agendador | Agenda (RF1), agendar manual, exportar (RF4), historial (RF5) |
| `medico1` | medico | Agenda, exportar e historial |
| `paciente1` | paciente | Completar perfil, agendar su cita (RF2), ver y cancelar sus citas |

Un paciente nuevo puede crear su cuenta con el enlace **"Register"** de la pantalla de Keycloak;
recibe automáticamente el rol `paciente`.

Consola de Keycloak: http://localhost:8080 (usuario y clave de `KC_ADMIN` en `.env`).

## Pruebas

```bash
cd backend/clinica-api
npm test            # 125 pruebas unitarias
npm run test:cov    # con reporte de cobertura (dominio + aplicación)
```

## Gestión de usuarios y roles por Postman

Importe `docs/piedrazul.postman_collection.json`. Incluye:
1. Obtener token de usuario (para probar la API).
2. Obtener token de administrador de Keycloak.
3. Crear usuario, asignarle un rol y listar usuarios (API de administración de Keycloak).
