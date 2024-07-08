import constants from "./constants.js";
const openDSU = require("opendsu");
const scAPI = openDSU.loadAPI("sc");

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
export default {
    getSorUserId,
    getSharedEnclaveKey
}