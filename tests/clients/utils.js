
class UtilsService {
    config;
    constructor(config) {
        this.config = config;
    }

    initMessage(model, msgType) {
        return Object.assign({
            messageType: msgType,
            messageTypeVersion: 2,
            senderId: this.config.senderId,
            receiverId: "QPNVR",
            messageId: this.generateID(16),
            messageDateTime: new Date().toISOString()
        }, {
            payload: model
        })
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

    static isEqual(a, b, ...propsToIgnore) {
        // Handle simple cases
        if (a === b) {
            // Special case for +0 and -0
            return a !== 0 || 1 / a === 1 / b;
        }
        if (a == null || b == null) return a === b;
        if (typeof a !== typeof b) return false;

        // Handle NaN
        if (Number.isNaN(a) && Number.isNaN(b)) return true;

        // Handle primitive types
        if (typeof a !== "object") return a === b;

        // Handle Date objects
        if (a instanceof Date && b instanceof Date) {
            // Check if both dates are invalid
            if (isNaN(a.getTime()) && isNaN(b.getTime())) return true;
            return a.getTime() === b.getTime();
        }

        // Handle RegExp objects
        if (a instanceof RegExp && b instanceof RegExp)
            return a.toString() === b.toString();

        // Handle Error objects
        if (a instanceof Error && b instanceof Error) {
            return a.name === b.name && a.message === b.message;
        }

        // Handle Array objects
        if (Array.isArray(a) && Array.isArray(b)) {
            if (a.length !== b.length) return false;
            for (let i = 0; i < a.length; i++) {
                if (!this.isEqual(a[i], b[i], ...propsToIgnore)) return false;
            }
            return true;
        }

        // Handle Map objects
        if (a instanceof Map && b instanceof Map) {
            if (a.size !== b.size) return false;
            for (const [key, value] of a) {
                if (!b.has(key) || !this.isEqual(value, b.get(key), ...propsToIgnore))
                    return false;
            }
            return true;
        }

        // Handle Set objects
        if (a instanceof Set && b instanceof Set) {
            if (a.size !== b.size) return false;
            for (const item of a) {
                if (!b.has(item)) return false;
            }
            return true;
        }

        // Handle TypedArray objects
        if (ArrayBuffer.isView(a) && ArrayBuffer.isView(b)) {
            if (a.byteLength !== b.byteLength) return false;
            if (a.byteOffset !== b.byteOffset) return false;
            if (a.buffer.byteLength !== b.buffer.byteLength) return false;

            const uint8A = new Uint8Array(a.buffer, a.byteOffset, a.byteLength);
            const uint8B = new Uint8Array(b.buffer, b.byteOffset, b.byteLength);

            for (let i = 0; i < uint8A.length; i++) {
                if (uint8A[i] !== uint8B[i]) return false;
            }
            return true;
        }

        // Handle other objects
        const aKeys = Object.keys(a).filter((k) => !propsToIgnore.includes(k));
        const bKeys = Object.keys(b).filter((k) => !propsToIgnore.includes(k));

        if (aKeys.length !== bKeys.length) return false;

        for (const key of aKeys) {
            if (!bKeys.includes(key)) return false;
            if (!this.isEqual(a[key], b[key], ...propsToIgnore))
                return false;
        }

        // Handle Symbol properties
        const aSymbols = Object.getOwnPropertySymbols(a).filter(
            (s) => !propsToIgnore.includes(s.toString())
        );
        const bSymbols = Object.getOwnPropertySymbols(b).filter(
            (s) => !propsToIgnore.includes(s.toString())
        );

        if (aSymbols.length !== bSymbols.length) return false;

        for (const sym of aSymbols) {
            if (!bSymbols.includes(sym)) return false;
            if (!this.isEqual(a[sym], b[sym], ...propsToIgnore))
                return false;
        }

        // Add this check right before the final return statement
        if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) {
            return false;
        }

        return true;
    }

    static getTicket(testName){
        const testRegexp = /^((:?TRUST|LWA)-\d+)\s(STEP\s\d+)(\s-\s(.+))?$/g
        const match = testRegexp.exec(testName);
        if (!match) {
            throw new Error(`Your test name does not follow the pattern 'TRUST|LWA-XXX STEP XXX - description'`)
        }
        return {
            ticket: match[1],
            step: match[2],
            description: match[4] || ""
        }
    }
}

module.exports = {
    UtilsService
};
