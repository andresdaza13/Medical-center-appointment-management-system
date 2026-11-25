/**
 * Elige la base de datos de las pruebas de integración.
 *
 * - En CI (GitHub Actions) se define DATABASE_URL_TEST y se usa tal cual.
 * - En local se toma DATABASE_URL del archivo .env y se le agrega "_test" al
 *   nombre de la base: piedrazul → piedrazul_test.
 *
 * SEGURIDAD: las pruebas BORRAN las tablas antes de cada caso. Por eso este
 * archivo se niega a continuar si el nombre de la base no termina en "_test":
 * así nunca se vacía por error la base de desarrollo.
 */
const fs = require('fs');
const path = require('path');

function leerArchivoEnv(ruta) {
  if (!fs.existsSync(ruta)) return {};
  const variables = {};
  for (const linea of fs.readFileSync(ruta, 'utf8').split(/\r?\n/)) {
    const texto = linea.trim();
    if (!texto || texto.startsWith('#') || !texto.includes('=')) continue;
    const i = texto.indexOf('=');
    variables[texto.slice(0, i).trim()] = texto.slice(i + 1).trim().replace(/^["']|["']$/g, '');
  }
  return variables;
}

function urlBaseDePruebas() {
  if (process.env.DATABASE_URL_TEST) return process.env.DATABASE_URL_TEST;

  const desarrollo = leerArchivoEnv(path.join(__dirname, '..', '..', '.env')).DATABASE_URL;
  if (!desarrollo) {
    throw new Error('Falta DATABASE_URL en backend/clinica-api/.env (o DATABASE_URL_TEST en el entorno).');
  }
  const url = new URL(desarrollo);
  url.pathname = `${url.pathname}_test`;
  return url.toString();
}

function urlBaseDePruebasSegura() {
  const url = urlBaseDePruebas();
  const nombreBase = new URL(url).pathname.slice(1);
  if (!nombreBase.endsWith('_test')) {
    throw new Error(`Por seguridad, las pruebas de integración solo corren contra una base "*_test" (recibí "${nombreBase}").`);
  }
  return url;
}

module.exports = { urlBaseDePruebasSegura };

// Jest ejecuta este archivo antes de cada archivo de prueba (setupFiles):
// PrismaService lee DATABASE_URL al crearse, así que apunta a la base de pruebas.
process.env.DATABASE_URL = urlBaseDePruebasSegura();