const fs = require('fs');
const xslFile = "apihub-root/lwa/app/js/services/XMLDisplayService/leafletXSL.js";

fs.readFile(xslFile, 'utf8', (err, data) => {
  if (err){
    console.log(err)
    process.exit(1)
  }

  const result = data.replace(/export\s*{/g, "module.exports = {");

  fs.writeFile('gtin-resolver/lib/services/XMLDisplayService/lwaLeafletXSL.js', result, 'utf8', err => {
    if (err){
      console.log(err)
      process.exit(1)
    }
    console.log("lwa leafletXSL successfully copied for gtin-resolver")
  })
})
