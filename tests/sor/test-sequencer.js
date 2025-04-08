const Sequencer = require('@jest/test-sequencer').default;

class SORTestSequencer extends Sequencer {
    /**
     * Sort test to determine order of execution
     * Sorting is applied after sharding
     */
    sort(tests) {
        const copyTests = [...tests];
        return copyTests.sort((testA, testB) => {
            const regexp = /(?:TRUST|LWA)-(\d+)\.([\w-]+)\.test\.js$/g;
            const numberA = parseInt(regexp.exec(testA.path)[1]);
            regexp.lastIndex = 0;
            const numberB = parseInt(regexp.exec(testB.path)[1]);
            return numberA > numberB ? 1 : -1;
        });
    }
}

module.exports = SORTestSequencer;