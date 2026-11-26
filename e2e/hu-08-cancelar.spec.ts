import { test, expect } from '@playwright/test';

test.describe('HU-08: Cancelación de citas', () => {
  test('Paciente cancela una cita con justificación (con 2+ días de anticipación)', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[name="username"]', 'paciente1');
    await page.fill('input[name="password"]', 'Piedrazul2026');
    await page.click('input[type="submit"], button[type="submit"]');
    await page.waitForURL(url => !url.href.includes('keycloak') && !url.href.includes('8080'), { timeout: 15000 });

    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Mis citas' }).click();
    
    // Ahora sí, la cita es a 4 días, así que el botón de cancelar estará habilitado
    const botonCancelar = page.locator('button:has-text("Cancelar"):not([disabled])').first();
    await expect(botonCancelar).toBeVisible({ timeout: 10000 });
    await botonCancelar.click();
    
    // Llenar justificación y confirmar
    await page.locator('#justificacion').fill('No puedo asistir por motivos personales.');
    await page.getByRole('button', { name: 'Cancelar cita' }).click();
    
    // Verificar mensaje de éxito y que la cita cambió a cancelada
    await expect(page.getByText('Su cita fue cancelada.')).toBeVisible();
    await expect(page.locator('.badge-cancelada').first()).toBeVisible();
  });
});