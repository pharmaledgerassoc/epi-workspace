import {getCredentialService} from "./JWTCredentialService.js";

function getPKFromContent(stringContent) {
    const crypto = require("opendsu").loadAPI("crypto");
    return crypto.sha256(stringContent);
}

class GroupsManager {
    constructor() {
    }

    async createGroup(groupData) {
        const openDSU = require("opendsu");
        const w3cdid = openDSU.loadAPI("w3cdid");
        const scAPI = openDSU.loadAPI("sc");
        const enclaveDB = await $$.promisify(scAPI.getMainEnclave)();
        const didDomain = await $$.promisify(scAPI.getDIDDomain)();

        const group = {};
        group.name = groupData.groupName;
        group.tags = groupData.groupTags;
        let enclaveName, accessMode;
        if (groupData.accessModes) {
            [enclaveName, accessMode] = groupData.accessModes.split(':');
            group.enclaveName = enclaveName;
            group.accessMode = accessMode;
        }

        let groupName = groupData.groupName.replaceAll(" ", "_");
        let groupDIDDocument;
        try {
            groupDIDDocument = await $$.promisify(w3cdid.resolveDID)(`did:ssi:group:${didDomain}:${groupName}`);
        } catch (e) {
        }
        if (typeof groupDIDDocument === "undefined") {
            groupDIDDocument = await promisify(w3cdid.createIdentity)("ssi:group", didDomain, groupName);
            group.did = groupDIDDocument.getIdentifier();

            const sharedEnclaveDB = await $$.promisify(scAPI.getSharedEnclave)();
            let batchId = await sharedEnclaveDB.startOrAttachBatchAsync();
            try {
                await sharedEnclaveDB.insertRecordAsync(constants.TABLES.GROUPS, group.did, group);

                const adminDID = await enclaveDB.readKeyAsync(constants.IDENTITY);
                const credentialService = getCredentialService();
                const groupCredential = await credentialService.createVerifiableCredential(adminDID.did, group.did);
                await sharedEnclaveDB.insertRecordAsync(constants.TABLES.GROUPS_CREDENTIALS, getPKFromContent(groupCredential), {
                    issuer: adminDID.did,
                    groupDID: group.did,
                    token: groupCredential,
                    credentialType: constants.CREDENTIAL_TYPES.WALLET_AUTHORIZATION,
                    encodingType: constants.JWT_ENCODING,
                    tags: [group.name, constants.CREDENTIAL_TYPES.WALLET_AUTHORIZATION]
                });
            } catch (e) {
                try {
                    await sharedEnclaveDB.cancelBatchAsync(batchId);
                } catch (err) {
                    console.log(err);
                }

                throw e;
            }
            try {
                await sharedEnclaveDB.commitBatchAsync(batchId);
            } catch (e) {
                try {
                    await sharedEnclaveDB.cancelBatchAsync(batchId);
                } catch (err) {
                    console.log(err);
                }
            }
        }
    }

    async addMember(groupName, newMember) {

    }

    async removeMember(groupName, member) {

    }

    async getMembers(groupDID) {
        if (!groupDID) {
            throw new Error(`Missing mandatory group info`);
        }

        return new Promise((resolve, reject) => {
            const w3cDID = require("opendsu").loadAPI("w3cdid");
            w3cDID.resolveDID(groupDID, (err, groupDIDDocument) => {
                if (err) {
                    return reject(err);
                }

                groupDIDDocument.listMembersInfo((err, members) => {
                    if (err) {
                        return reject(err);
                    }
                    return resolve(members);
                });
            });
        });
    }

    async deactivateMember(groupName, member) {
        const openDSU = require("opendsu");
        const system = openDSU.loadAPI("system");
        const config = openDSU.loadAPI("config");
        const crypto = openDSU.loadAPI("crypto");
        const http = openDSU.loadAPI("http");

        await this.removeMember(groupName, member);
        const appName = await $$.promisify(config.getEnv)("appName");
        const did = crypto.encodeBase58(member);
        let url = `${system.getBaseURL()}/deactivateSSOSecret/${appName}/${did}`;
        await http.fetch(url, {method: "DELETE"});
    }
}

let instance;

export function getInstance() {
    if (!instance) {
        instance = new GroupsManager();
    }
    return instance;
}
