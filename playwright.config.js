const { devices, defineConfig } = require('@playwright/test');


module.exports =  defineConfig({
    testDir: './tests/playwright', // Caminho para a pasta onde os testes estão localizados
    timeout: 30000,     // Tempo limite para cada teste (em milissegundos)
    retries: 0,         // Número de tentativas em caso de falha
    use: {
      permissions: ['camera'],
      headless: true,   // Executar os testes no modo headless
      channel: 'chrome' // Configura o navegador para usar o Google Chrome
    },
    projects: [
        {
            name: 'Chrome',
            use: {
                ...devices['Desktop Chrome'],
                permissions: ['camera'],
                launchOptions: {}
            },
        },
        // {
        //     name: 'Mobile Chrome',
        //     use: {
        //         ...devices['Pixel 5'],
        //         launchOptions: {
        //             args: [],
        //         }
        //     },  
        // },

        // {
        //     name: 'Mobile Safari',
        //     use: {
        //         ...devices['iPhone 13'],
        //         launchOptions: {
        //             args: [],
        //         }
        //     },
        // },
    ],
})