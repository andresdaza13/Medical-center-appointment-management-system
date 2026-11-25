// @ts-check
import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default defineConfig([
  // Ignorar carpetas generadas
  globalIgnores(['dist/**', 'node_modules/**', 'coverage/**']),
  
  // Configuración base para JS y TS
  {
    files: ['**/*.{js,ts}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
    ],
    rules: {
      // Aquí puedes apagar reglas muy estrictas si te dan problemas (opcional)
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  
  // Prettier SIEMPRE debe ir al final para apagar reglas de formato conflictivas
  eslintConfigPrettier,
]);