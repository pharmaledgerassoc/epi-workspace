require("../../opendsu-sdk/builds/output/pskWebServer");
const PREFIX = 'DB_';
process.env.SSO_SECRETS_ENCRYPTION_KEY = "+WG9HhIoXGGSVq6cMlhy2P3vuiqz1O/WAaiF5JhXmnc="

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

const domain = "local.epi";
createSecret(domain, domain).then(() => {
    console.log("Done");
}).catch((err) => {
    console.log(err);
    process.exit(1);
})