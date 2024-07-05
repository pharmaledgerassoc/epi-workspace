const actions = ["Access Wallet", "Add User", "Remove User"]
const userGroups = ["Write", "Read"];
const userIds = ["q34trt0-0sdfg", "faer634764h5", "60670-1gtsg"];
const checkStatuses = ["Success", "Failure"];
const checkDates = ["2021-03-20T16:00:00", "2022-04-21T15:00:00", "2024-07-22T15:00:00"]
const devUserAuditLog = {
    "payload": {
        "userId": "devuser",
        "username": "devuser",
        "action": "Upload",
        "userDID": "did:demo:devuser:123",
        "userGroup": "Admin"
    }

};
const userAuditLog = {
    "payload":{
        "userId": "user",
        "username": "user",
        "action": "Wallet Access",
        "userDID": "did:demo:user:123",
        "userGroup": "Write"
    }
};
const healthCheckRun = {
    "payload":{
        "date": "2020-02-20T14:00:00",
        "status": "Success",
        "id": "1234",
        "healthCheck": "Health Check"
    }
}
let devUserLogs = [];
let userLogs = [];
let healthChecks = [];
for(let i = 0; i < 17; i++){
    let newDevUserAuditLog = JSON.parse(JSON.stringify(devUserAuditLog));
    newDevUserAuditLog.payload.action = actions[Math.floor(Math.random() * actions.length)];
    newDevUserAuditLog.payload.userDID = i;
    devUserLogs.push(newDevUserAuditLog);

    let newUserAuditLog = JSON.parse(JSON.stringify(userAuditLog));
    newUserAuditLog.payload.userGroup = userGroups[Math.floor(Math.random() * userGroups.length)];
    newUserAuditLog.payload.userId = userIds[Math.floor(Math.random() * userIds.length)];
    newDevUserAuditLog.payload.userDID = i;
    userLogs.push(newUserAuditLog);

    let newHealthCheckRun = JSON.parse(JSON.stringify(healthCheckRun));
    newHealthCheckRun.payload.status = checkStatuses[Math.floor(Math.random() * checkStatuses.length)];
    newHealthCheckRun.payload.date = checkDates[Math.floor(Math.random() * checkDates.length)];
    healthChecks.push(newHealthCheckRun);
}
export default {
    devUserLogs,
    userLogs,
    healthChecks
}