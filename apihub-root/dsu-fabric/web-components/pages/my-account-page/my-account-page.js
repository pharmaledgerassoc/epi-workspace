import constants from "../../../constants.js";

const openDSU = require("opendsu");
const config = openDSU.loadAPI("config");
const credentialsAPI = openDSU.loadAPI("credentials");
const scAPI = openDSU.loadAPI("sc");

export class MyAccountPage {
  constructor(element, invalidate) {
    this.invalidate = invalidate;
    this.invalidate(this.getCredential);
  }

  beforeRender() {
    this.did = "did:ssi:name:vault:DSU_Fabric/devuser";
    this.jwt = "{\n" +
      "        \"jwtHeader\": {\n" +
      "        \"alg\": \"ES256\",\n" +
      "        \"typ\": \"JWT\"\n" +
      "        },\n" +
      "        \"jwtPayload\": {\n" +
      "        \"sub\": \"did:ssi:group:vault:ePI_Write_Group\",\n" +
      "        \"iss\": \"did:ssi:name:vault:Demiurge/devuser\",\n" +
      "        \"nbf\": 1705589611713,\n" +
      "        \"exp\": 1705621147713,\n" +
      "        \"iat\": 1705589611713,\n" +
      "        \"vc\": {\n" +
      "        \"@context\": [\n" +
      "        \"https://www.w3.org/2018/credentials/v1\"\n" +
      "        ],\n" +
      "        \"type\": [\n" +
      "        \"VerifiableCredential\"\n" +
      "        ],\n" +
      "        \"credentialSubject\": {\n" +
      "        \"id\": \"did:ssi:group:vault:ePI_Write_Group\"\n" +
      "        },\n" +
      "        \"issuer\": \"did:ssi:name:vault:Demiurge/devuser\",\n" +
      "        \"issuanceDate\": \"2024-01-18T14:53:31Z\",\n" +
      "        \"expirationDate\": \"2024-01-18T23:39:07Z\"\n" +
      "        }\n" +
      "        }\n" +
      "        }";
    this.walletSettings = "{\n" +
      "        \"jwtHeader\": {\n" +
      "        \"alg\": \"ES256\",\n" +
      "        \"typ\": \"JWT\"\n" +
      "        },\n" +
      "        \"jwtPayload\": {\n" +
      "        \"sub\": \"did:ssi:group:vault:ePI_Write_Group\",\n" +
      "        \"iss\": \"did:ssi:name:vault:Demiurge/devuser\",\n" +
      "        \"nbf\": 1705589611713,\n" +
      "        \"exp\": 1705621147713,\n" +
      "        \"iat\": 1705589611713,\n" +
      "        \"vc\": {\n" +
      "        \"@context\": [\n" +
      "        \"https://www.w3.org/2018/credentials/v1\"\n" +
      "        ],\n" +
      "        \"type\": [\n" +
      "        \"VerifiableCredential\"\n" +
      "        ],\n" +
      "        \"credentialSubject\": {\n" +
      "        \"id\": \"did:ssi:group:vault:ePI_Write_Group\"\n" +
      "        },\n" +
      "        \"issuer\": \"did:ssi:name:vault:Demiurge/devuser\",\n" +
      "        \"issuanceDate\": \"2024-01-18T14:53:31Z\",\n" +
      "        \"expirationDate\": \"2024-01-18T23:39:07Z\"\n" +
      "        }\n" +
      "        }\n" +
      "        }";
  }

  async navigateToProductsPage() {

  }

  getAppBuildVersion(str) {
    //the purpose of regex is to extract the json part from
    const regex = /{[\s\S]*}/gm;

    let matches;
    while ((matches = regex.exec(str)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (matches.index === regex.lastIndex) {
        regex.lastIndex++;
      }

      if (matches.length) {
        //found it...
        let envJSON = matches[0];
        try {
          envJSON = JSON.parse(envJSON);
        } catch (err) {
          console.log("Failed to properly parse environment file for app version extraction. Switching to fallback method");
          continue;
        }
        return envJSON["appBuildVersion"];
      }
    }

    //this code should not be reached... but I'll let it here for fallback for the moment.
    let appBuildVersionText = str.split(",").find(item => item.includes("appBuildVersion"));
    let version = appBuildVersionText.split(":")[1];
    version = version.trim();
    if (version.indexOf("}") !== -1) {
      version = version.replaceAll("}", "");
    }
    return version;
  }

  async setCredential(credential) {
    this.credential = credential;
    this.isInvalidCredential = false;
    return new Promise((resolve) => {
      credentialsAPI.parseJWTSegments(this.credential.token, async (parseError, jwtContent) => {
        if (parseError) {
          this.isInvalidCredential = true;
          return resolve(false);
        }
        const {jwtHeader, jwtPayload} = jwtContent;
        this.readableCredential = JSON.stringify({jwtHeader, jwtPayload}, null, 4);

        const readableContainer = document.querySelector('#readableContainer');
        let readableCredentialElement = readableContainer.querySelector('#readableCredential');
        if (readableCredentialElement) {
          readableCredentialElement.remove();
        }

        readableCredentialElement = document.createElement('div');
        readableCredentialElement.id = "readableCredential";
        readableCredentialElement.language = "json";
        readableCredentialElement.innerHTML = `<pre><code> ${this.readableCredential} </code></pre>`;
        readableContainer.appendChild(readableCredentialElement);
        /*
         * hidden for MVP1
        this.DSUStorage.enableDirectAccess(() => {
          let sc = require("opendsu").loadAPI("sc");
          sc.getMainDSU((err, mainDSU) => {
            if (err) {
               return this.notificationHandler.reportDevRelevantInfo('Error getting mainDSU', err);

               //return console.log('Error getting mainDSU', err);
            }


            mainDSU.getKeySSIAsString((err, keySSI) => {
                          this.walletKeySSI = keySSI
                        });

          })
        });
     */
        return resolve(true);
      });
    })


  }

  async renderSettingsContainer() {
    let envFile = await $$.promisify(config.readEnvFile)();
    //hide keySSI properties from display in ui
    delete envFile["enclaveKeySSI"];
    delete envFile["sharedEnclaveKeySSI"];
    //---------- get app version from server env file
    delete envFile["appBuildVersion"];
    const environmentJsPath = new URL("environment.js", window.top.location);
    const response = await fetch(environmentJsPath);
    const appEnvContent = await response.text();
    this.model.appVersion = this.getAppBuildVersion(appEnvContent)
    //-----------------------
    this.model.editableFeatures = !(!!envFile.lockFeatures);
    this.model.envData = envFile;
    const environmentContainer = document.querySelector('#environmentContainer');
    let environmentDataElement = environmentContainer.querySelector('#environmentData');
    if (environmentDataElement) {
      environmentDataElement.remove();
    }
    environmentDataElement = document.createElement('div');
    environmentDataElement.id = "environmentData";
    environmentDataElement.language = "json";
    environmentDataElement.innerHTML = `<pre><code>${JSON.stringify(envFile, null, 4)}</code></pre>`;
    environmentContainer.appendChild(environmentDataElement);
  }

  async getCredential() {
    try {
      let mainEnclave = await scAPI.getMainEnclave();
      try {
        let did = await scAPI.getMainDIDAsync();
        this.did = did;
        let credential = await $$.promisify(mainEnclave.readKey)(constants.CREDENTIAL_KEY);
        this.displayCredentialArea = !!credential;
        if (this.displayCredentialArea) {
          let result = await this.setCredential(credential);
          /*         if(!result){
                     return this.showErrorModalAndRedirect('Error parsing user credential', "Error", {tag: "home"})
                   }*/
          await this.renderSettingsContainer();
        }
      } catch (e) {
        this.displayCredentialArea = false;
      }
    } catch (err) {

    }


  }
}
