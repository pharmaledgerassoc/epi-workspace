import {getCredentialService} from "./JWTCredentialService.js";
import constants from "../constants.js";
import utils from "../utils.js";
import AppManager from "./AppManager.js";
import AuditService from "./AuditService.js";

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

async function getGroupByType(sharedEnclave, accessMode, groupId) {
    const _getGroup = async () => {
        try {
            const groups = await $$.promisify(sharedEnclave.filter)(constants.TABLES.GROUPS);
            const group = groups.find(gr => gr.accessMode === accessMode || gr.id === groupId) || {};
            if (!group) {
                throw new Error(`Group ${groupId} not found in the shared enclave`);
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

async function getSharedEnclaveDataFromEnv() {
    const openDSU = require("opendsu");
    const scAPI = openDSU.loadAPI("sc");
    const mainDSU = await $$.promisify(scAPI.getMainDSU)();
    let env = await $$.promisify(mainDSU.readFile)("/environment.json");
    env = JSON.parse(env.toString());
    let data = {
        "enclaveType": env[openDSU.constants.SHARED_ENCLAVE.TYPE],
        "enclaveDID": env[openDSU.constants.SHARED_ENCLAVE.DID],
        "enclaveKeySSI": env[openDSU.constants.SHARED_ENCLAVE.KEY_SSI]
    }
    return data;
}

class GroupsManager {
    constructor() {
    }

    async createGroup(groupData) {
        const openDSU = require("opendsu");
        const scAPI = openDSU.loadAPI("sc");
        const enclaveDB = await $$.promisify(scAPI.getMainEnclave)();
        const didDomain = await $$.promisify(scAPI.getDIDDomain)();

        const group = {};
        group.name = groupData.groupName;
        group.id = groupData.groupId;
        group.tags = groupData.groupTags;
        let enclaveName, accessMode;
        if (groupData.accessModes) {
            [enclaveName, accessMode] = groupData.accessModes.split(':');
            group.enclaveName = enclaveName;
            group.accessMode = accessMode;
        }
        const sharedEnclaveDB = await $$.promisify(scAPI.getSharedEnclave)();
        //let groupName = groupData.groupName.replaceAll(" ", "_");
        let groupDIDDocument;
        try {
            groupDIDDocument = await $$.promisify(sharedEnclaveDB.resolveDID)(`did:ssi:group:${didDomain}:${groupData.groupId}`);
        } catch (e) {
        }
        if (typeof groupDIDDocument === "undefined") {
            groupDIDDocument = await $$.promisify(sharedEnclaveDB.createIdentity)("ssi:group", didDomain, groupData.groupId);
            group.did = groupDIDDocument.getIdentifier();

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

    async addMember(groupId, memberDID) {
        const openDSU = require("opendsu");
        const w3cdid = openDSU.loadAPI("w3cdid");
        const scAPI = openDSU.loadAPI("sc");
        const crypto = openDSU.loadAPI("crypto");
        const apiKeyAPI = openDSU.loadAPI("apiKey");
        const allMembers = await this.getAllMembers();
        let alreadyExists = allMembers.find(arrMember => arrMember.did === memberDID)
        if (alreadyExists) {
            throw new Error("Member already registered in a group!");
        }
        let groupData = await this.getGroup(groupId);
        if (!memberDID.toLowerCase().includes(groupData.tags.toLowerCase())) {
            throw new Error("User can not be added to selected group. Please check user group.");
        }
        const memberDIDDocument = await $$.promisify(w3cdid.resolveDID)(memberDID);
        let newMember = {did: memberDID, username: memberDIDDocument.getName()}
        const apiKeyClient = apiKeyAPI.getAPIKeysClient();
        const mainEnclave = await $$.promisify(scAPI.getMainEnclave)();
        const sharedEnclave = await $$.promisify(scAPI.getSharedEnclave)();

        const groupDIDDocument = await $$.promisify(w3cdid.resolveDID)(groupData.did);
        let adminDID = await mainEnclave.readKeyAsync(constants.IDENTITY);
        adminDID = adminDID.did;
        let enclave = await getSharedEnclaveDataFromEnv();
        let groupCredential = await this.getGroupCredential(groupData.did);
        if (!groupCredential) {
            const credentialService = getCredentialService();
            const groupCredential = await credentialService.createVerifiableCredential(adminDID, groupData.did);

            await sharedEnclave.insertRecordAsync(constants.TABLES.GROUPS_CREDENTIALS, utils.getPKFromContent(groupCredential), {
                issuer: adminDID,
                groupDID: message.groupDID,
                token: groupCredential,
                credentialType: constants.CREDENTIAL_TYPES.WALLET_AUTHORIZATION,
                encodingType: constants.JWT_ENCODING,
                tags: [groupDIDDocument.getGroupName(), constants.CREDENTIAL_TYPES.WALLET_AUTHORIZATION]
            });
        }
        let allPossibleGroups = await sharedEnclave.filterAsync(constants.TABLES.GROUPS, "enclaveName == epiEnclave");
        groupCredential.allPossibleGroups = allPossibleGroups;
        if (groupData.accessMode === constants.ADMIN_ACCESS_MODE) {
            const _becomeSysAdmin = async () => {
                const sysadminSecret = await utils.getBreakGlassRecoveryCode();
                const apiKey = await crypto.sha256JOSE(crypto.generateRandom(32), "base64");
                const body = {
                    secret: sysadminSecret,
                    apiKey: apiKey
                };
                await apiKeyClient.becomeSysAdmin(JSON.stringify(body));
                await utils.setSysadminCreated(true);
            }

            const sysadminExists = await utils.getSysadminCreated();
            if (!sysadminExists) {
                await _becomeSysAdmin();
            } else {
                try {
                    await apiKeyClient.makeSysAdmin(utils.getUserIdFromUsername(newMember.username), crypto.sha256JOSE(crypto.generateRandom(32), "base64"));
                } catch (e) {
                    await _becomeSysAdmin();
                }
            }
        } else {
            const apiKey = {
                secret: crypto.sha256JOSE(crypto.generateRandom(32), "base64"),
                scope: groupData.accessMode
            }
            await apiKeyClient.associateAPIKey(constants.APPS.DSU_FABRIC, constants.API_KEY_NAME, utils.getUserIdFromUsername(newMember.username), JSON.stringify(apiKey));
        }
        await $$.promisify(groupDIDDocument.addMember)(memberDID, newMember);
        let SecretsHandler = w3cdid.SecretsHandler;
        let secretsHandler = await SecretsHandler.getInstance(adminDID);
        await secretsHandler.authorizeUser(memberDID, groupCredential, enclave);
        await AuditService.getInstance().addActionLog(constants.AUDIT_OPERATIONS.ADD, memberDID, groupId);

    }

    async removeMember(groupId, memberDID) {
        const userDID = await AppManager.getInstance().getDID();
        if (userDID === memberDID) {
            throw new Error("You tried to delete your account. This operation is not allowed.")
        }
        const openDSU = require("opendsu");
        const w3cdid = openDSU.loadAPI("w3cdid");
        const scAPI = openDSU.loadAPI("sc");
        const apiKeyAPIs = openDSU.loadAPI("apiKey");
        const apiKeyClient = apiKeyAPIs.getAPIKeysClient();
        const mainEnclave = await $$.promisify(scAPI.getMainEnclave)();
        let adminDID = await mainEnclave.readKeyAsync(constants.IDENTITY);
        let groupData = await this.getGroup(groupId);
        const groupDIDDocument = await $$.promisify(w3cdid.resolveDID)(groupData.did);
        const memberDIDDocument = await $$.promisify(w3cdid.resolveDID)(memberDID);
        if (groupData.accessMode === constants.ADMIN_ACCESS_MODE) {
            await apiKeyClient.deleteAdmin(utils.getUserIdFromUsername(memberDIDDocument.getName()));
        } else {
            await apiKeyClient.deleteAPIKey(constants.APPS.DSU_FABRIC, constants.API_KEY_NAME, utils.getUserIdFromUsername(memberDIDDocument.getName()));
        }

        await $$.promisify(groupDIDDocument.removeMembers)([memberDID]);
        let SecretsHandler = w3cdid.SecretsHandler;
        let secretsHandler = await SecretsHandler.getInstance(adminDID);
        await secretsHandler.unAuthorizeUser(memberDID);
        await AuditService.getInstance().addActionLog(constants.AUDIT_OPERATIONS.REMOVE, memberDID, groupId);
    }

    async getMembers(groupDID) {
        if (!groupDID) {
            throw new Error(`Missing mandatory group info`);
        }

        return new Promise(async (resolve, reject) => {
            const scAPI = require("opendsu").loadAPI("sc");
            const sharedEnclaveDB = await $$.promisify(scAPI.getSharedEnclave)();
            sharedEnclaveDB.resolveDID(groupDID, (err, groupDIDDocument) => {
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

    async getMemberInfo(memberDID) {
        let groups = await this.getGroups();
        let result;
        for (let i = 0; i < groups.length; i++) {
            let groupMembers = await this.getMembers(groups[i].did);
            let memberData = groupMembers.find(member => member.did === memberDID)
            if (memberData) {
                result = {member: memberData, group: groups[i]};
                break;
            }
        }
        return result;
    }

    async getAllMembers() {
        let groups = await this.getGroups();
        let allMembers = [];
        for (let i = 0; i < groups.length; i++) {
            let groupMembers = await this.getMembers(groups[i].did);
            allMembers = [...allMembers, ...groupMembers]
        }
        return allMembers;
    }

    async getAdminGroup(sharedEnclave) {
        return getGroupByType(sharedEnclave, constants.ADMIN_ACCESS_MODE, constants.EPI_ADMIN_GROUP);
    }

    async getWriteGroup(sharedEnclave) {
        return getGroupByType(sharedEnclave, constants.WRITE_ACCESS_MODE, constants.EPI_WRITE_GROUP);
    }

    async getReadGroup(sharedEnclave) {
        return getGroupByType(sharedEnclave, constants.READ_ONLY_ACCESS_MODE, constants.EPI_READ_GROUP);
    }

    async getGroupCredential(groupDID) {
        const openDSU = require("opendsu");
        const scAPI = openDSU.loadAPI("sc");
        const sharedEnclave = await $$.promisify(scAPI.getSharedEnclave)();
        const credentials = await sharedEnclave.filterAsync(constants.TABLES.GROUPS_CREDENTIALS, `groupDID == ${groupDID}`);
        let groupCredential = credentials.find(el => el.credentialType === constants.CREDENTIAL_TYPES.WALLET_AUTHORIZATION);
        return groupCredential;
    }

    async getGroups() {
        const openDSU = require("opendsu");
        const scAPI = openDSU.loadAPI("sc");
        const sharedEnclaveDB = await $$.promisify(scAPI.getSharedEnclave)();
        let groups;
        try {
            groups = await $$.promisify(sharedEnclaveDB.filter)(constants.TABLES.GROUPS);
        } catch (e) {
            webSkel.notificationHandler.reportUserRelevantError(`Failed to fetch groups`);
        }
        if (groups.length > 0) {
            groups.forEach(group => {
                if (!group.id) {
                    group.id = group.name.replaceAll(" ", "_");
                }
            });
        }
        return groups;
    }

    async getGroup(groupId) {
        let groups = await this.getGroups();
        return groups.find(group => group.id === groupId);
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
