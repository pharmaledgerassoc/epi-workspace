const path = require('path');
const fs = require('fs');
const { addAttach, addMsg } = require("jest-html-reporters/helper");

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
     * @param {"json" | "image" | "text" | "md"} type
     * @param trim
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
     async _save(step, reference, data, type, trim = false) {
        const dir = path.join(this._basePath, step);
        try {
            // if (!fs.existsSync(dir)) {
            //     fs.mkdirSync(dir, { recursive: true });
            // }
            const extension = type === "image" ? ".png" : (type === "text" ? ".txt" : (type === "md" ? ".md" : ".json"));
            console.log(`Storing Reporting artifact ${reference}${extension} for ${this.testCase} step ${step}`);
            let file = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 17) + `-${reference}${extension}`
            switch (type) {
                case "image":
                    data = Buffer.from(data);
                    await addAttach({
                        attach: data,
                        description: file
                    })
                    break;
                case "json":
                    if (trim){
                        if (data.request)
                            delete data["request"];
                        if (data.config)
                            delete data["config"];
                    }
                    data = JSON.stringify(data, null, 2);
                case "md":
                case "text":
                    await addMsg({
                        message: `${step ? `${step.toUpperCase()} - ` : ""}artifact: ${file}\n${data}`
                    });
                    break
                default:
                    console.log(`Unsupported type ${type}. assuming text`);
            }

            // fs.writeFileSync(path.join(dir, file), data, 'utf8');
        } catch (e){
            throw new Error(`Could not store Reporting artifact ${reference} under ${dir} - ${e.message}`);
        }
    }

    generatePath(step) {
        return path.join(this._basePath, step);
    }

    retrievePayload(step, reference, extension = ".json") {
        const p = path.join(this._basePath, step, `${reference}${extension}`);

        const data = fs.readFileSync(p, "utf8"); // Read file
        const jsonData = JSON.parse(data); // Parse JSON

        return jsonData;
    }

    async outputPayload(step, reference, data, type = "json", trim = false) {
         return this._save(step, reference, data, type, trim);
    }

    /**
     * @description Outputs JSON data to a file.
     * @summary Converts the provided JSON object to a string and saves it to a file.
     *
     * @param {string} step - The step identifier within the test case.
     * @param {string} reference - The reference name for the file (without extension).
     * @param {Object} json - The JSON object to be saved.
     *
     * @param trim
     * @mermaid
     * sequenceDiagram
     *   participant O as outputJSON
     *   participant S as _save
     *   O->>O: Stringify JSON
     *   O->>S: Call _save with JSON string
     */
    async outputJSON(step, reference, json, trim = false){
        return this._save(step, reference, json, "json", trim);
    }

    async outputMDTable(step, reference, json, titles, headers, keys){
        const text = []

        function pushHeader(txt) {
            text.push({h3: txt})
        }

        function pushParagraph(txt) {
            text.push({p: txt});
        }

        function pushTable(){
            text.push({table: {
                    headers: headers,
                    rows: Object.entries(json).reduce((accum, [key, val]) => {
                        const row = []
                        for (let i = 0; i < headers.length; i++) {
                            if (i === 0){
                                row.push(key)
                            } else {
                                row.push(val[keys[i - 1]])
                            }
                        }
                        accum.push(row)
                        return accum;
                    }, [])
                }
            })
        }

        titles = typeof titles === "string" ? [titles] : titles;
        for (let i = 0; i < titles.length; i++) {
            if (i === 0)
                pushHeader(titles[i]);
            else
                pushParagraph(titles[i])
        }

        pushTable()

        let txt;

        try {
            const json2md = require("json2md");
            txt = json2md(text)
        } catch (e) {
            throw new Error(`Could not convert JSON to Markdown - ${e.message}`);
        }

        return this._save(step, reference, txt, "md");
    }
    //
    // async outputGraph(step, reference, json, titles, headers){
    //     const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
    //
    //     const width = 600; //px
    //     const height = 800; //px
    //     const backgroundColour = 'white'; // Uses https://www.w3schools.com/tags/canvas_fillstyle.asp
    //     const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height, backgroundColour});
    //     const configuration = {
    //         ... // See https://www.chartjs.org/docs/latest/configuration
    //     };
    //     const image = await chartJSNodeCanvas.renderToBuffer(configuration);
    //     const dataUrl = await chartJSNodeCanvas.renderToDataURL(configuration);
    //     const stream = chartJSNodeCanvas.renderToStream(configuration);
    //
    // }

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
    async outputImage(step, reference, buffer){
        return this._save(step, reference, buffer, "image");
    }
}

module.exports = {
    Reporter
};