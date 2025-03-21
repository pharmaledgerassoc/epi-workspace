import {getUserDetails} from "../utils/utils.js";

export class UtilsService {
    config;
    constructor(config) {
        this.config = config;
    }


    initMessage(model, msgType) {
        Object.assign(model, {
            messageType: msgType,
            messageTypeVersion: 2,
            senderId: getUserDetails(),
            receiverId: "QPNVR",
            messageId: webSkel.appServices.generateID(16),
            messageDateTime: new Date().toISOString()
        })
        return model;
    }

    cleanMessage(message) {
        let cleanMessage = JSON.parse(JSON.stringify(message));
        this.dbMessageFields.forEach(field => {
            if (field in cleanMessage) {
                delete cleanMessage[field]
            }
        })
        return cleanMessage;
    }

    generateID(length) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        return this.generate(characters, length);
    }

    generate(charactersSet, length) {
        let result = '';
        const charactersLength = charactersSet.length;
        for (let i = 0; i < length; i++) {
            result += charactersSet.charAt(Math.floor(Math.random() * charactersLength));
        }
        return result;
    }

}
