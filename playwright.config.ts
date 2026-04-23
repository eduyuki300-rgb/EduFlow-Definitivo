import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://127.0.0.1:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Garante que o servidor esteja rodando se necessário (opcional, já está no terminal)
  webServer: {
    command: '.\\node_modules\\.bin\\tsx.cmd server.ts',
    url: 'http://127.0.0.1:3000/api/health',
    reuseExistingServer: !process.env.CI,
  },
});
