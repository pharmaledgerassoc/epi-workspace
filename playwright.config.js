const { devices, defineConfig } = require('@playwright/test');

module.exports =  defineConfig({
    testDir: './tests/playwright', // Caminho para a pasta onde os testes estão localizados
    timeout: 30000,     // Tempo limite para cada teste (em milissegundos)
    retries: 2,         // Número de tentativas em caso de falha
    use: {
      permissions: ['geolocation'],
      headless: true,   // Executar os testes no modo headless
      channel: 'chrome' // Configura o navegador para usar o Google Chrome
    },
    projects: [
        {
            name: 'Chrome',
            use: {
                ...devices['Desktop Chrome'],
                launchOptions: {
                    args: ['--disable-web-security',
                        '--use-fake-ui-for-media-stream',
                        '--use-fake-device-for-media-stream',
                    ],
                }
            },
        },

        {
            name: 'Mobile Chrome',
            use: {
                ...devices['Pixel 5'],
                launchOptions: {
                    args: [],
                }
            },  
        },

        {
            name: 'Mobile Safari',
            use: {
                ...devices['iPhone 13'],
                launchOptions: {
                    args: [],
                }
            },
        },
    ],
})