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
export default {
    getSorUserId,
    getSharedEnclaveKey,
    detectCurrentPage,
    fetchGroups
}