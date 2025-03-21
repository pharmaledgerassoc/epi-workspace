const fs = require('fs');
const path = require('path');

let testConf;

/**
 * Parses the test configuration file and populates it with environment variables.
 * Environment variables take precedence over the values in the config file.
 * The environment variable names are derived from the config properties by
 * converting them to uppercase and replacing dots with underscores.
 *
 * @typedef {{
 *     tenantId: string,
 *     clientSecret: string,
 *     scope: string,
 *     clientId: string,
 *     senderId: string
 * }} Config
 *
 * @returns {{tenantId: string, clientSecret: string, scope: string, clientId: string, senderId: string}} The populated configuration object.
 * @throws {Error} If the config file cannot be read or parsed.
 */
function getConfig() {
    if (testConf)
        return testConf;
    const configPath = path.join(process.cwd(), 'tests', 'config', 'test.config.json');

    try {
        // Read and parse the JSON file
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);

        // Function to convert property name to environment variable format
        const toEnvFormat = (key) => key.replace(/([A-Z])/g, '_$1')  // Insert underscore before capitals
                                        .replace(/[.\s-]*/g, '_')         // Replace dots with underscores
                                        .replace(/_{2}/g, '_')         // Replace dots with underscores
                                        .toUpperCase()               // Convert all to uppercase

        // Iterate through all properties and check for environment variables
        for (const [key, value] of Object.entries(config)) {
            const envKey = toEnvFormat(key);
            if (process.env[envKey] !== undefined) {
                config[key] = process.env[envKey];
            }
        }

        testConf = config
    } catch (error) {
        throw new Error(`Error parsing test config: ${error.message}`);
    }

    return testConf;
}

module.exports = {
    getConfig
};