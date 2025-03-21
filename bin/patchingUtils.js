const fs = require("fs");

/**
 * Replaces placeholders in the format ${Variable} within a string.
 *
 * @param {string} input - The input string containing placeholders.
 * @param {Object} values - A mapping of placeholder names to their replacement values.
 * @returns {string} - The string with placeholders replaced.
 */
function replacePlaceholders(input, values) {
    return input.replace(/\$\{([a-zA-Z0-9_]+)\}/g, (match, variable) => values[variable] || match);
}

function patchFile(path, values) {
    if (!fs.existsSync(path))
        throw new Error(`File not found at path "${path}".`);

    try {
        const jsonString = fs.readFileSync(path, 'utf8');
        const updatedJsonString = replacePlaceholders(jsonString, values);

        fs.writeFileSync(path, updatedJsonString, 'utf8');
        console.log(`Successfully updated "${path}".`);
    } catch (error) {
        throw new Error(`Error updating JSON file: ${error.message}`);
    }
}

/**
 * Patches a JSON file by replacing placeholders and optionally applying a transformation.
 *
 * This function reads a JSON file, replaces placeholders with provided values,
 * optionally applies a transformation function to the parsed JSON data,
 * and then writes the updated JSON back to the file.
 *
 * @param {string} path - The file path of the JSON file to be patched.
 * @param {Object} values - An object containing key-value pairs for placeholder replacement.
 * @param {Function} [transformation] - Optional function to transform the JSON data after placeholder replacement.
 * @throws {Error} Throws an error if the file is not found at the specified path or if update failed.
 * @returns {void}
 */
function patchJSONFile(path, values, transformation = undefined){
        if (!fs.existsSync(path))
            throw new Error(`File not found at path "${path}".`);

    try {
        const jsonString = fs.readFileSync(path, 'utf8');
        const updatedJsonString = replacePlaceholders(jsonString, values);

        let jsonData = JSON.parse(updatedJsonString);

        if (transformation)
            jsonData = transformation(jsonData);

        fs.writeFileSync(path, JSON.stringify(jsonData, null, 2), 'utf8');
        console.log(`Successfully updated "${path}".`);
    } catch (error) {
        throw new Error(`Error updating JSON file: ${error.message}`);
    }
}

module.exports = {
    replacePlaceholders,
    patchJSONFile,
    patchFile
}