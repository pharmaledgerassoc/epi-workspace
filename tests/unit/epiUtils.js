const utils =require("../../gtin-resolver/lib/utils/CommonUtils");
const fs = require('fs');

function getImageAsBase64(imageData,type) {
    if (typeof imageData === "string") {
        return imageData;
    }
    let base64Image;

    const buffer = $$.Buffer.isBuffer(imageData) ? imageData : $$.Buffer.from(imageData);
    base64Image = buffer.toString('base64');

    if(type)
        return `data:${type};base64,${base64Image}`;
    return `data:image/png;base64,${base64Image}`;
}


export function loadLeafletFromFolder(folder){
    try {
        let xmlContent;
        let images = {}
        let leafletImagesObj = {};
        this.images = {};

        let files = fs.readdirSync(folder);
        for (const file of files){
            if (file.endsWith('.xml')){
                xmlContent = fs.readFileSync(file);
            } else {
                let imgFile = fs.readFileSync(file);
                if(file.endsWith("mp4")){
                    leafletImagesObj[file] = this.images[file] = utils.getImageAsBase64(imgFile, "video/mp4");
                } else {
                    leafletImagesObj[file] = this.images[file] = utils.getImageAsBase64(imgFile);
                }
            }
        }

        callback(undefined, textDecoder.decode(xmlContent), `${pathToLeafletLanguage}/`, leafletImagesObj);
        return
    } catch (e) {
        throw new Error(`Error loading Leaflet from folder: ${folder}`);
    }
}