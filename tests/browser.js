globalThis.window = globalThis.window || {
    addEventListener: (...args) => {
        console.log(`Mocked addEventListener:`, args);
    },
};
globalThis.localStorage = globalThis.localStorage || {};

console.log(`browser apis mocked`)