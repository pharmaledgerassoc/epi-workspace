import {getCredentialService} from "./JWTCredentialService.js";
import constants from "../../../demiurge/code/scripts/constants";

function getPKFromContent(stringContent) {
    const crypto = require("opendsu").loadAPI("crypto");
    return crypto.sha256(stringContent);
}

function retryAsyncFunction(asyncFunction, maxTries, timeBetweenRetries, ...args) {
    return new Promise(async (resolve) => {
        let attempt = 0;
        while (attempt < maxTries) {
            try {
                const result = await asyncFunction(...args);
                resolve(result); // Successful execution, resolve the promise with the result
                return; // Exit the function
            } catch (error) {
                attempt++;
                if (attempt >= maxTries) {
                    $$.forceTabRefresh();
                } else {
                    await new Promise(resolve => setTimeout(resolve, timeBetweenRetries)); // Wait before the next retry
                }
            }
        }
    });
}

async function getGroupByType(sharedEnclave, accessMode, groupName) {
    const _getGroup = async () => {
        try {
            const groups = await $$.promisify(sharedEnclave.filter)(constants.TABLES.GROUPS);
            const group = groups.find(gr => gr.accessMode === accessMode || gr.name === groupName) || {};
            if (!group) {
                throw new Error(`Group ${groupName} not found in the shared enclave`);
            }
            return group;
        } catch (e) {
            webSkel.notificationHandler.reportUserRelevantWarning(`Failed to retrieve configuration data. Retrying ...`);
            webSkel.notificationHandler.reportUserRelevantInfo(`Failed to get info about group. Retrying ...`, e);
            throw e;
        }
    }
    return await retryAsyncFunction(_getGroup, 3, 100);
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

    async getAdminGroup(sharedEnclave) {
        return getGroupByType(sharedEnclave, constants.ADMIN_ACCESS_MODE, constants.EPI_ADMIN_GROUP_NAME);
    }

    async getWriteGroup(sharedEnclave) {
        return getGroupByType(sharedEnclave, constants.WRITE_ACCESS_MODE, constants.EPI_WRITE_GROUP);
    }

    async getReadGroup(sharedEnclave) {
        return getGroupByType(sharedEnclave, constants.READ_ONLY_ACCESS_MODE, constants.EPI_READ_GROUP);
    }
}

let instance;

function getInstance() {
    if (!instance) {
        instance = new GroupsManager();
    }
    return instance;
}

export default {getInstance};