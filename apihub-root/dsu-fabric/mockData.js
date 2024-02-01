const gtin = '02113111111164';
const gtin2 = '00000000000000';
const batchNumber = 'B123';
const batchNumber2 = 'A456';
const productDetails = {
  "messageType": "Product",
  "messageTypeVersion": 1,
  "senderId": "ManualUpload",
  "receiverId": "QPNVS",
  "messageId": "S000001",
  "messageDateTime": "2023-01-11T09:10:01CET",
  "payload": {
    "productCode": "02113111111164",
    "internalMaterialCode": "",
    "inventedName": "BOUNTY",
    "nameMedicinalProduct": "BOUNTY® 250 mg / 0.68 mL pre-filled syringe",
    "strength": ""
  }
};
const productDetails2 = {
  "messageType": "Product2",
  "messageTypeVersion": 1,
  "senderId": "ManualUpload",
  "receiverId": "QPNVS",
  "messageId": "S000002",
  "messageDateTime": "2024-01-11T09:10:01CET",
  "payload": {
    "productCode": "00000000000000",
    "internalMaterialCode": "",
    "inventedName": "PRODUCT2",
    "nameMedicinalProduct": "PRODUCT2® 1000 mg / 1.04 mL pre-filled syringe",
    "strength": ""
  }
};
const batchDetails = {
  "messageType": "Batch",
  "messageTypeVersion": 1,
  "senderId": "ManualUpload",
  "receiverId": "QPNVS",
  "messageId": "S000001",
  "messageDateTime": "2023-01-11T09:10:01CET",
  "payload": {
    "productCode": "02113111111164",
    "batch": "B123",
    "packagingSiteName": "",
    "expiryDate": "230600"
  }
};
const batchDetails2 = {
  "messageType": "Batch",
  "messageTypeVersion": 1,
  "senderId": "ManualUpload",
  "receiverId": "QPNVS",
  "messageId": "S000001",
  "messageDateTime": "2024-01-11T09:10:01CET",
  "payload": {
    "productCode": "00000000000000",
    "batch": "A456",
    "packagingSiteName": "",
    "expiryDate": "240600"
  }
};
const leafletDetails = {
  "messageType": "leaflet",
  "messageTypeVersion": 1,
  "senderId": "ManualUpload",
  "receiverId": "QPNVS",
  "messageId": "S000001",
  "messageDateTime": "2023-01-11T09:10:01CET",
  payload: {
    "productCode": "02113111111164",
    "language": "en",
    "xmlFileContent": "xmlFileContent"
  }
}

const germanLeaflet = {
  "messageType": "leaflet",
  "messageTypeVersion": 1,
  "senderId": "ManualUpload",
  "receiverId": "QPNVS",
  "messageId": "S000001",
  "messageDateTime": "2023-01-11T09:10:01CET",
  payload: {
    "productCode": "02113111111164",
    "language": "de",
    "xmlFileContent": "xmlFileContent"
  }
}

const imageData = {
  "messageType": "ProductPhoto",
  "messageTypeVersion": 1,
  "senderId": "ManualUpload",
  "receiverId": "QPNVS",
  "messageId": "S000001",
  "messageDateTime": "2023-01-11T09:10:01CET",
  payload: {
    "productCode": "02113111111164",
    "imageId": "123456789",
    "imageType": "front",
    "imageFormat": "png",
    "imageData": "https://www.bayer.com/en/bayer-products/product-details/bounty-250-mg-0-68-ml-pre-filled-syringe"
  }
}
const accessLog = {
  "username": "user",
  "reason": "Created Product",
  "itemCode": "00000000031059",
  "anchorId": "Z8s5VtVtfCHVyveRKwqUb3hciWfxDDzedykF9oBkj65Mn6DQi7oQFbt4Wjz7grswCvVRX6o3KEKGbefHb5fBxrHpeinvsLT4rrSfnKzuP9dozsYYyuqTbACWUqx2MoiRpaPSzCeRmeibn1vUT71ABjXejRio1",
  "hashLink": "2HqJt69J687THmZfpfJ9iafoJtB2vUGE7wd8eQdYFW7j7EiUnLLNxGkQdz9J5dMpLZmL56b1mHkZSTmBz63tgJVTD7bQuiBf93wBjdPA4eM7PCrJgnQf4Hh1A6BZk8ssrqdo9jZ4dar7eaiLdWUFXg2DAp5KeHtaT2vikmR26hTCSyU39uQ1hZeR2YPwGLbGTkak7ueHU21gPJNupj1UX7Gpx7VFqN8FsGBxDfRP2Eevb",
  "metadata": {
    "gtin": "00000000031059"
  },
  "isAccessLog": "true",
  "userGroup": "ePI_Write_Group",
  "userDID": "did:ssi:name:vault:DSU_Fabric/user",
  "logInfo": {
    "messageType": "Product",
    "messageTypeVersion": 1,
    "senderId": "nicoleta@axiologic.net",
    "receiverId": "",
    "messageId": "6733277145574",
    "messageDateTime": "2024-01-23T13:04:50.881Z",
    "token": "",
    "payload": {
      "inventedName": "BN1059",
      "productCode": "00000000031059",
      "nameMedicinalProduct": "NN1059",
      "manufName": "",
      "flagEnableAdverseEventReporting": false,
      "flagEnableACFProductCheck": false,
      "healthcarePractitionerInfo": "SmPC",
      "patientSpecificLeaflet": "Patient Information",
      "markets": [],
      "internalMaterialCode": "",
      "strength": ""
    }
  }
}
const actionLog = {
  "username": "user",
  "reason": "Created Product",
  "itemCode": "00000000031059",
  "anchorId": "Z8s5VtVtfCHVyveRKwqUb3hciWfxDDzedykF9oBkj65Mn6DQi7oQFbt4Wjz7grswCvVRX6o3KEKGbefHb5fBxrHpeinvsLT4rrSfnKzuP9dozsYYyuqTbACWUqx2MoiRpaPSzCeRmeibn1vUT71ABjXejRio1",
  "hashLink": "2HqJt69J687THmZfpfJ9iafoJtB2vUGE7wd8eQdYFW7j7EiUnLLNxGkQdz9J5dMpLZmL56b1mHkZSTmBz63tgJVTD7bQuiBf93wBjdPA4eM7PCrJgnQf4Hh1A6BZk8ssrqdo9jZ4dar7eaiLdWUFXg2DAp5KeHtaT2vikmR26hTCSyU39uQ1hZeR2YPwGLbGTkak7ueHU21gPJNupj1UX7Gpx7VFqN8FsGBxDfRP2Eevb",
  "metadata": {
    "gtin": "00000000031059"
  },
  "logInfo": {
    "messageType": "Product",
    "messageTypeVersion": 1,
    "senderId": "nicoleta@axiologic.net",
    "receiverId": "",
    "messageId": "6733277145574",
    "messageDateTime": "2024-01-23T13:04:50.881Z",
    "token": "",
    "payload": {
      "inventedName": "BN1059",
      "productCode": "00000000031059",
      "nameMedicinalProduct": "NN1059",
      "manufName": "",
      "flagEnableAdverseEventReporting": false,
      "flagEnableACFProductCheck": false,
      "healthcarePractitionerInfo": "SmPC",
      "patientSpecificLeaflet": "Patient Information",
      "markets": [],
      "internalMaterialCode": "",
      "strength": ""
    }
  }
}
const actionLog2 = {
  "username": "user",
  "reason": "Created Product",
  "itemCode": "00000000031059",
  "anchorId": "Z8s5VtVtfCHVyveRKwqUb3hciWfxDDzedykF9oBkj65Mn6DQi7oQFbt4Wjz7grswCvVRX6o3KEKGbefHb5fBxrHpeinvsLT4rrSfnKzuP9dozsYYyuqTbACWUqx2MoiRpaPSzCeRmeibn1vUT71ABjXejRio1",
  "hashLink": "2HqJt69J687THmZfpfJ9iafoJtB2vUGE7wd8eQdYFW7j7EiUnLLNxGkQdz9J5dMpLZmL56b1mHkZSTmBz63tgJVTD7bQuiBf93wBjdPA4eM7PCrJgnQf4Hh1A6BZk8ssrqdo9jZ4dar7eaiLdWUFXg2DAp5KeHtaT2vikmR26hTCSyU39uQ1hZeR2YPwGLbGTkak7ueHU21gPJNupj1UX7Gpx7VFqN8FsGBxDfRP2Eevb",
  "metadata": {
    "gtin": "00000000031059"
  },
  "logInfo": {
    "messageType": "Product",
    "messageTypeVersion": 1,
    "senderId": "nicoleta@axiologic.net",
    "receiverId": "",
    "messageId": "6733277145574",
    "messageDateTime": "2024-01-23T13:04:50.881Z",
    "token": "",
    "payload": {
      "inventedName": "BN1059",
      "productCode": "00000000031059",
      "nameMedicinalProduct": "NN1059",
      "manufName": "",
      "flagEnableAdverseEventReporting": false,
      "flagEnableACFProductCheck": false,
      "healthcarePractitionerInfo": "SmPC",
      "patientSpecificLeaflet": "Patient Information",
      "markets": [],
      "internalMaterialCode": "",
      "strength": ""
    }
  }
}

export {
  gtin,
  gtin2,
  batchNumber,
  batchNumber2,
  productDetails,
  productDetails2,
  batchDetails,
  batchDetails2,
  leafletDetails,
  germanLeaflet,
  imageData,
  accessLog,
  actionLog,
  actionLog2
}
