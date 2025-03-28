const {Model} = require("./Model");

class LeafletFile extends Model {

    filename = "";
    fileContent = "";

    constructor(filename, fileContent) {
        super();
        Model.fromObject(this, {filename, fileContent});
    }
}

module.exports = {
    LeafletFile
}