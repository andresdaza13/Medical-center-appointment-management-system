import { test, expect } from '@playwright/test';

test.describe('HU-02: Agendamiento autónomo de citas', () => {
  test('Paciente inicia sesión, agenda en una franja libre y la ve en Mis citas', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[name="username"]', 'paciente1');
    await page.fill('input[name="password"]', 'Piedrazul2026');
    await page.click('input[type="submit"], button[type="submit"]');
    await page.waitForURL(url => !url.href.includes('keycloak') && !url.href.includes('8080'), { timeout: 15000 });

    if (page.url().includes('completar-perfil')) {
      await page.waitForSelector('form');
      const inputs = page.locator('form input');
      await inputs.nth(0).fill('1061000099');
      await inputs.nth(1).fill('Paciente');
      await inputs.nth(2).fill('Prueba');
      await inputs.nth(3).fill('3001234567');
      await page.getByRole('button', { name: /guardar|completar/i }).click();
      await page.waitForURL(url => !url.href.includes('completar-perfil'), { timeout: 10000 });
    }

    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Agendar cita' }).click();
    await expect(page.getByRole('heading', { name: /Agendar/i })).toBeVisible();
    
    // Seleccionar FISIOTERAPIA (Armando atiende martes y jueves, dando tiempo para cancelar)
    await page.getByRole('radio', { name: 'Fisioterapia' }).click();
    
    // Usar las sugerencias (que ahora sí serán en fechas lejanas)
    await page.waitForSelector('.franja.ancha', { state: 'visible', timeout: 10000 });
    await page.locator('.franja.ancha').first().click();
    
    await page.getByRole('button', { name: 'Confirmar cita' }).click();

    const alertaError = page.locator('.alerta-error');
    const alertaExito = page.getByText('Cita confirmada');
    
    await Promise.race([
      alertaExito.waitFor({ state: 'visible', timeout: 5000 }),
      alertaError.waitFor({ state: 'visible', timeout: 5000 })
    ]);

    if (await alertaError.isVisible()) {
      console.log('🚨 ERROR DEL BACKEND:', await alertaError.textContent());
      throw new Error('El backend rechazó la cita');
    }

    await expect(alertaExito).toBeVisible();
    
    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Mis citas' }).click();
    await expect(page.locator('.badge-agendada').first()).toBeVisible();
  });
});