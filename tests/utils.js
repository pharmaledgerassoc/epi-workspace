const constants = require("./constants")
/**
 * Generates a date string in YYMMDD format adjusted by a time period
 * @param {string} period - Time period to adjust (e.g. "1y", "-2m", "3d")
 * @returns {string} Date in YYMMDD format
 */
function getYYMMDDDate(period) {
    const date = new Date();

    // Parse period (e.g. "-1y" → { value: -1, unit: 'y' })
    const match = period.match(/^(-?\d+)([ymd])$/i);
    if (!match) throw new Error(`Invalid period format. Use like "1y", "-2m", "3d"`);

    const value = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    // Adjust date
    switch (unit) {
        case "y":
            date.setFullYear(date.getFullYear() + value);
            break;
        case "m":
            date.setMonth(date.getMonth() + value);
            break;
        case "d":
            date.setDate(date.getDate() + value);
            break;
    }

    // Format as DDMMYY
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);

    return year + month + day;
}

function getRandomNumber() {
    return parseInt(Math.random().toString().replace(".", ""));
}

const convertLeafletFolderToObject = (folderPath) => {
    const leafletObject = {
        "messageTypeVersion": 1,
        "senderId": "devuser",
        "receiverId": "",
        "messageId": "6628938783353",
        "messageDateTime": "2022-06-29T09:40:15.583Z",
        "messageType": "leaflet",
        "payload": {
            // "status": "new",
            "language": "en",
            "xmlFileContent": "",
            "otherFilesContent": []
        }
    }

    const fs = require('fs');
    const path = require('path');
    const files = fs.readdirSync(folderPath);
    for (const file of files) {
        const filePath = path.join(folderPath, file);
        const fileData = fs.readFileSync(filePath);
        // if file is xml update xmlFileContent else add to otherFileContent
        if (file.endsWith('.xml')) {
            leafletObject.payload.xmlFileContent = fileData.toString('base64');
        } else {
            leafletObject.payload.otherFilesContent.push({
                "filename": file,
                "fileContent": fileData.toString('base64')
            });
        }
    }
    return leafletObject;
}

/**
 * Test the audit logs 
 * @param {IntegrationClient} client  - IntegrationClient instance
 * @param {Object} oldObject  - original object to compare (if undefined it means it is a creation)
 * @param {Object} newObject  - new object to compare after the action
 */
async function userActionAuditTest(client, oldObject, newObject) {
    const auditResponse = await client.filterAuditLogs(constants.constants.AUDIT_LOG_TYPES.USER_ACCTION, undefined, 1, "timestamp > 0", "desc");
    const audit = auditResponse.data[0];
    const {diffs} = audit.details[0]
    
    Object.entries(diffs).forEach(([key, value]) => {
        if (key === "epiProtocol")
            return true
        expect(value.oldValue).toEqual(oldObject ? oldObject[key]: "");
        expect(value.newValue).toEqual(newObject[key]);
    })
}


module.exports = {getYYMMDDDate, getRandomNumber, convertLeafletFolderToObject, userActionAuditTest}