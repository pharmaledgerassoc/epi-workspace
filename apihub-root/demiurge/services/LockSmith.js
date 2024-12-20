const opendsu = require("opendsu");
const lockApi = opendsu.loadApi("lock");

async function acquireLock(resourceId, period, attempts, timeout) {
    const utils = opendsu.loadApi("utils");
    const crypto = opendsu.loadApi("crypto");
    let secret = crypto.encodeBase58(crypto.generateRandom(32));

    let lockAcquired;
    let noAttempts = attempts;
    while (noAttempts > 0) {
        noAttempts--;
        lockAcquired = await lockApi.lockAsync(resourceId, secret, period);
        if (!lockAcquired) {
            await utils.sleepAsync(timeout);
        } else {
            break;
        }
        if (noAttempts === 0) {
            if (window && window.confirm("Somebody else is editing right now. Do you want to wait for him to finish?")) {
                noAttempts = attempts;
            }
        }
    }
    if (!lockAcquired) {
        secret = undefined;
    }

    return secret;
}

async function releaseLock(resourceId, secret) {
    try {
        await lockApi.unlockAsync(resourceId, secret);
    } catch (err) {
        //if the unlock fails, the lock will be released after the expiration period set at the beginning.
    }
}

async function getLock(resourceId, period, attempts, timeout) {
    let lockId;
    try{
        lockId = await acquireLock(resourceId, period, attempts, timeout);
    }catch(err){
        throw new Error("Failed to ensure no concurrency. Try again.");
    }

    if(!lockId){
        throw new Error("Operation failed. Try again.");
    }
    return lockId;
}

export default {acquireLock, releaseLock, getLock};