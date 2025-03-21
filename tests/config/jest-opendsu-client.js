const {OPENDSU_PROCESS_PROP} = require('./constants');
require("../browser")

/**
 * After the {@link setupOpenDSUForJest} ran, use this method to reset openDSU in the global this
 * like so:
 *
 * ```javascript
 * // (in the jest test file)
 *
 * import {setOpenDSU} from '@glass-project1/dsu-utils/lib';
 *
 * beforeAll(() => {
 *     setOpenDSU();
 *     ...
 * });
 * ```
 *
 * @function setOpenDSU
 */
function setOpenDSU(){
    const descriptor = Object.getOwnPropertyDescriptor(process, OPENDSU_PROCESS_PROP);
    if (!descriptor || ! descriptor.value)
        throw new Error("No OpenDSU found in process");
    const {opendsu} = descriptor.value
    if (!opendsu)
        throw new Error("No OpenDSU found in process");

    const propertyInscriber = function(prop, value){
        Object.defineProperty(globalThis, prop, {
            writable: false,
            configurable: false,
            value: value
        })
    }

    Object.entries(descriptor.value).forEach(([prop, value]) => {
        propertyInscriber(prop, value);
    });
}

function cacheOpenDSU(openDSU){
    Object.defineProperty(process, OPENDSU_PROCESS_PROP, {
        writable: false,
        configurable: false,
        value: openDSU
    });
}

module.exports = {
    setOpenDSU,
    cacheOpenDSU
}