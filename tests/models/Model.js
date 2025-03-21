/**
 * @description Base model class for data objects.
 * @summary The Model class provides a foundation for creating data models with
 * common functionality such as object initialization, serialization, and deserialization.
 * 
 * @class
 */
class Model {
    /**
     * @description Creates a new Model instance.
     * @summary Initializes a Model object by populating it with properties from the provided model object.
     * 
     * @param {Object} [model] - The object containing initial property values.
     */
    constructor(model) {
        Model.fromObject(this, model);
    }
    
    /**
     * @description Converts the model to a JSON payload.
     * @summary Creates a JSON string representation of the model, excluding undefined and function properties.
     * 
     * @returns {string} A JSON string representing the model's data.
     * 
     * @mermaid
     * sequenceDiagram
     *   participant T as toPayload
     *   participant J as JSON
     *   T->>T: Filter properties
     *   T->>J: Stringify filtered object
     *   J-->>T: Return JSON string
     */
    toPayload(){
        const self = this;
        return JSON.stringify(Object.keys(this).reduce((acc, key) => {
            if(typeof self[key] !== "undefined" && typeof self[key] !== "function")
                acc[key] = self[key];
            return acc;
        }, {}));
    }

    /**
     * @description Populates a model instance from an object.
     * @summary Static method that copies properties from a source object to a target model instance.
     * 
     * @param {Model} self - The target model instance to populate.
     * @param {Object} [obj={}] - The source object containing property values.
     * @returns {Model} The populated model instance.
     * 
     * @mermaid
     * sequenceDiagram
     *   participant F as fromObject
     *   participant S as Self
     *   F->>S: Get keys of self
     *   loop For each property
     *     F->>S: Set property from obj or undefined
     *   end
     *   F-->>F: Return populated self
     */
    static fromObject(self, obj) {
        if (!obj) obj = {};
        const keys = Object.keys(self)
        for (const prop of keys) {
            self[prop] = obj[prop] || undefined;
        }
        return self;
    }
}

module.exports = {
    Model
};