require("../../opendsu-sdk/builds/output/pskWebServer");
const PREFIX = 'DB_';

const createSecret = async (domain, subdomain) => {
    const rootFolder = "../"
    const secretsServiceInstance = await require('apihub').getSecretsServiceInstanceAsync(rootFolder);
    const generateEnclaveName = (domain, subdomain) => {
        return `${PREFIX}${domain}_${subdomain}`;
    }

    const crypto = require('opendsu').loadAPI('crypto');
    let secret = crypto.generateRandom(32).toString('base64');
    await secretsServiceInstance.putSecretAsync("default", generateEnclaveName(domain, subdomain), secret);
    console.log(`Secret for enclave ${generateEnclaveName(domain, subdomain)} created`);
}

// Extract domain and subdomain from command line arguments
const [domain, subdomain] = process.argv.slice(2);
if (!domain || !subdomain) {
    console.log("Usage: node script.js <domain> <subdomain>");
    process.exit(1);
}

createSecret(domain, subdomain).then(() => {
    console.log("Done");
}).catch((err) => {
    console.log(err);
    process.exit(1);
})
