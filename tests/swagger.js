const Swagger = require('swagger-client')
const path = require('path');


let client;


/**
 * Retrieves or initializes a Swagger client instance.
 * 
 * This function returns an existing Swagger client if one has already been created,
 * or creates a new client using the ePI-SOR.json specification file if no client exists.
 * The client is stored in a module-level variable to ensure only one instance is created.
 * 
 * @returns {Swagger} The Swagger client instance.
 */
function getSwaggerClient() {
    if (client)
        return client;
    client = new Swagger(path.join(process.cwd(),"gtin-resolver", "ePI-SOR.json"));
    return client;
}