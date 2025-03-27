const {Model} = require("./Model");

class LeafletFile extends Model {

    fileName = "";
    fileContent = "";

    constructor(fileName, fileContent) {
        super();
        Model.fromObject(this, {fileName, fileContent});
    }
}

module.exports = {
    LeafletFile
}