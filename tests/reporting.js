const path = require('path');
const fs = require('fs');

/**
 * @description A class for handling test case reporting.
 * @summary The Reporter class provides functionality to save and output test artifacts
 * such as JSON data and images. It organizes the artifacts by test case and step.
 *
 * @class
 * @param {string} testCase - The name or identifier of the test case.
 * @param {string} [basePath=process.cwd()] - The base path for storing reports.
 *
 * @property {string} testCase - @description The name or identifier of the test case.
 * @property {string} _basePath - @description The base path for storing reports.
 */
export class Reporter {
    testCase;
    _basePath;

    /**
     * @description Creates a new Reporter instance.
     * @summary Initializes a Reporter object with the given test case and base path.
     *
     * @param {string} testCase - The name or identifier of the test case.
     * @param {string} [basePath=process.cwd()] - The base path for storing reports.
     */
    constructor(testCase, basePath = process.cwd()) {
        this.testCase = testCase;
        this._basePath = basePath;
    }

    /**
     * @description Saves data to a file.
     * @summary Creates the necessary directory structure and saves the provided data to a file.
     *
     * @param {string} step - The step identifier within the test case.
     * @param {string} reference - The reference name for the file.
     * @param {Buffer|string} data - The data to be saved.
     * @throws {Error} If directory creation or file writing fails.
     *
     * @mermaid
     * sequenceDiagram
     *   participant S as _save
     *   participant FS as FileSystem
     *   S->>FS: Check if directory exists
     *   alt Directory doesn't exist
     *     S->>FS: Create directory
     *   end
     *   S->>FS: Write file
     */
     _save(step, reference, data) {
        const dir = path.join(this._basePath, 'workdocs', 'reports', this.testCase, step);
        if(!fs.existsSync(dir)) {
            try {
                fs.mkdirSync(dir, {recursive: true})
            } catch (e){
                throw new Error(`Could not create Reporting directory: ${dir} - ${e.message}`);
            }
        }
        try {
            fs.writeFileSync(path.join(dir, `${reference}`), data, 'utf8');
        } catch (e){
            throw new Error(`Could store Reporting artifact ${reference} under ${dir} - ${e.message}`);
        }
    }

    /**
     * @description Outputs JSON data to a file.
     * @summary Converts the provided JSON object to a string and saves it to a file.
     *
     * @param {string} step - The step identifier within the test case.
     * @param {string} reference - The reference name for the file (without extension).
     * @param {Object} json - The JSON object to be saved.
     *
     * @mermaid
     * sequenceDiagram
     *   participant O as outputJSON
     *   participant S as _save
     *   O->>O: Stringify JSON
     *   O->>S: Call _save with JSON string
     */
    outputJSON(step, reference, json){
        this._save(step, `${reference}.json`, Buffer.from(JSON.stringify(json, null, 2)));
    }

    /**
     * @description Outputs an image to a file.
     * @summary Saves the provided image buffer to a PNG file.
     *
     * @param {string} step - The step identifier within the test case.
     * @param {string} reference - The reference name for the file (without extension).
     * @param {Buffer} buffer - The image data as a Buffer.
     *
     * @mermaid
     * sequenceDiagram
     *   participant O as outputImage
     *   participant S as _save
     *   O->>S: Call _save with image buffer
     */
    outputImage(step, reference, buffer){
        this._save(step, `${reference}.png`, buffer);
    }
}