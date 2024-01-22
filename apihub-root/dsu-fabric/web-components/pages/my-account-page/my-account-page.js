export class MyAccount {
    constructor(element,invalidate) {
        this.invalidate = invalidate;
        this.invalidate();
    }
    beforeRender() {
        this.userDID = "did:ssi:name:vault:DSU_Fabric/devuser";
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

    async navigateToProductsPage(){

    }
}