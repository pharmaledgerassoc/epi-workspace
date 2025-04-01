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
class Reporter {
    testCase;
    _basePath;

    /**
     * @description Creates a new Reporter instance.
     * @summary Initializes a Reporter object with the given test case and base path.
     *
     * @param {string} testCase - The name or identifier of the test case.
     * @param {string} [basePath=process.cwd()] - The base path for storing reports.
     */
    constructor(testCase = "tests", basePath = path.join(process.cwd(), "workdocs", "reports", "evidences")) {
        this.testCase = testCase;
        this._basePath = path.join(basePath, testCase);
        if (!fs.existsSync(basePath)) {
            fs.mkdirSync(basePath, {recursive: true});
        }
    }

    /**
     * @description Saves data to a file.
     * @summary Creates the necessary directory structure and saves the provided data to a file.
     *
     * @param {string} step - The step identifier within the test case.
     * @param {string} reference - The reference name for the file.
     * @param {Buffer|string|Object} data - The data to be saved.
     * @param {"json" | "image" | "text"} type
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
     _save(step, reference, data, type) {
        const dir = path.join(this._basePath, step);
        try {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const extension = type === "image" ? ".png" : (type === "text" ? ".txt" : ".json");
            console.log(`Storing Reporting artifact ${reference}${extension} for ${this.testCase} step ${step}`);
            switch (type) {
                case "image":
                    data = Buffer.from(data);
                    break;
                case "json":
                    data = JSON.stringify(data, null, 2);
                    break;
                case "text":
                    break
                default:
                    console.log(`Unsupported type ${type}. assuming text`);
            }
            fs.writeFileSync(path.join(dir, `${reference}${extension}`), data, 'utf8');
        } catch (e){
            throw new Error(`Could not store Reporting artifact ${reference} under ${dir} - ${e.message}`);
        }
    }

    generatePath(step) {
        return path.join(this._basePath, step);
    }

    async outputPayload(step, reference, data, type = "json"){
         return this._save(step, reference, data, type);
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
        this._save(step, reference, json, "json");
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
        this._save(step, reference, buffer, "image");
    }
}

module.exports = {
    Reporter
};