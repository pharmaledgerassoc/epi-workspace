const actions = ["Access Wallet", "Add User", "Remove User"]
const userGroups = ["Write", "Read"];
const userIds = ["q34trt0-0sdfg", "faer634764h5", "60670-1gtsg"];
const devUserAuditLog = {
    "payload": {
        "userId": "devuser",
        "username": "devuser",
        "action": "Upload",
        "userDID": "did:demo:devuser:123",
        "userGroup": "Admin",
    }
};
const userAuditLog = {
    "payload": {
        "userId": "user",
        "username": "user",
        "action": "Wallet Access",
        "userDID": "did:demo:user:123",
        "userGroup": "Write",
    }
};
let devUserLogs = [];
let userLogs = [];
for(let i = 0; i < 17; i++){
    devUserAuditLog.payload.action = actions[Math.floor(Math.random() * actions.length)];
    devUserLogs.push(devUserAuditLog);
    userAuditLog.payload.userGroup = userGroups[Math.floor(Math.random() * userGroups.length)];
    userAuditLog.payload.userId = userIds[Math.floor(Math.random() * userIds.length)];
    userLogs.push(userAuditLog);
}
export default {
    devUserLogs,
    userLogs
}