const fs = require('fs');
const libxmljs = require('libxmljs2');
const path = require('path');

describe("Leaflet Schema", () => {
    let schemaContent;
    const validXmlContent = '../resources/schema/valid/export.xml';
    const invalidXmlContent = '../resources/schema/invalid/export.xml';

    function readFileContent(filePath) {
        return fs.readFileSync(path.resolve(__dirname, filePath), 'utf8');
    }

    function validateXmlContent(content) {
        const xmlContent = readFileContent(content);
        const xmlDoc = libxmljs.parseXml(xmlContent);
        const xsdDoc = libxmljs.parseXml(schemaContent);
        return xmlDoc.validate(xsdDoc);
    }

    beforeAll(() => {
        schemaContent = readFileContent('../resources/leaflet-schema.xsd');
    });

    it("Must be a valid Schema", async () => {
       const validate = libxmljs.parseXml(schemaContent);
       expect(validate.errors.length).toBe(0);
    });

    it("Must be a valid Leaflet", async () => {
       const isValid = validateXmlContent(validXmlContent)
       expect(isValid).toBe(true);
    });

    it("Must be a invalid Leaflet", async () => {
       const isValid = validateXmlContent(invalidXmlContent)
       expect(isValid).toBe(false);
    });
});