import constants from "./constants.js";
import Message from "../../demiurge/code/scripts/utils/Message";
const openDSU = require("opendsu");
const scAPI = openDSU.loadAPI("sc");
const w3cdid = openDSU.loadAPI("w3cdid");
const getSorUserId = async () => {
    return await getSharedEnclaveKey(constants.SOR_USER_ID);
}
const getSharedEnclaveKey = async (key) => {
    const sharedEnclave = await $$.promisify(scAPI.getSharedEnclave)();
    let record;
    try {
        record = await sharedEnclave.readKeyAsync(key);
    } catch (e) {
        // ignore
    }
    return record;
}
const detectCurrentPage = () =>{
    let currentPage = window.location.hash.slice(1);
    let presenterName = currentPage.split("/")[0];
    if (currentPage === "") {
        currentPage = "groups-page";
        presenterName = "groups-page";
    }
    return {currentPage, presenterName};
}
async function fetchGroups() {
    const enclaveDB = await $$.promisify(scAPI.getSharedEnclave)();
    let groups;
    try {
        groups = await $$.promisify(enclaveDB.filter)(constants.TABLES.GROUPS);
    } catch (e) {
        return console.log(e);
    }
    return groups;
}
async function sendUserMessage(sender, group, member, content, contentType, recipientType, operation) {
    let didDocument = await $$.promisify(w3cdid.resolveDID)(sender);
    const receiverDIDDocument = await $$.promisify(w3cdid.resolveDID)(member.did);
    const message = new Message();
    message.setSender(sender);
    message.setContent(content);
    message.setContentType(contentType);
    message.setRecipientType(recipientType);
    message.setGroupDID(group.did);
    message.setOperation(operation);

    await $$.promisify(didDocument.sendMessage)(message, receiverDIDDocument);
}
export default {
    getSorUserId,
    getSharedEnclaveKey,
    detectCurrentPage,
    fetchGroups
}