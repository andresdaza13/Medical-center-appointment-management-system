/**
 * Se ejecuta UNA vez antes de todas las pruebas de integración (globalSetup):
 * aplica las migraciones a la base de pruebas, para que tenga exactamente el
 * mismo esquema que producción. Es lo mismo que hará el pipeline de CI.
 */
const { execSync } = require('child_process');
const path = require('path');
const { urlBaseDePruebasSegura } = require('./entorno');

module.exports = async () => {
  execSync('npx prisma migrate deploy', {
    cwd: path.join(__dirname, '..', '..'),
    env: { ...process.env, DATABASE_URL: urlBaseDePruebasSegura() },
    stdio: 'inherit',
  });
};