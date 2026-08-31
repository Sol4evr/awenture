import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  timeout: 30000,
  use: { baseURL: 'http://127.0.0.1:4173' },
  webServer: {
    command: 'python3 -m http.server 4173 --bind 127.0.0.1 --directory dist',
    port: 4173,
    reuseExistingServer: false,
    timeout: 10000
  },
  projects: [
    { name: 'webkit-ipad', use: { ...devices['iPad (gen 7)'] } },
    { name: 'chromium-desktop', use: { ...devices['Desktop Chrome'] } }
  ]
});
