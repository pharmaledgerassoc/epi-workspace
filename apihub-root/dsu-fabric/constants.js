export default {
    YES: 'Yes',
    'PACKAGES_STORAGE_PATH': "/app/data/packages.json",
    'DATA_STORAGE_PATH': "/app/data",
    'PRODUCTS_TABLE': "products",
    'BLOCKCHAIN_SCANS_TABLE': "blockchain_scans",
    'LOGS_TABLE': "logs",
    'LOGIN_LOGS_TABLE': "login_logs",
    'SERIAL_NUMBERS_LOGS_TABLE': "serial_numbers_logs",
    'PRODUCT_KEYSSI_STORAGE_TABLE': "productKeySSIs",
    'BATCHES_STORAGE_TABLE': "batches",
    'PRODUCT_DSU_MOUNT_POINT': "/gtinDSU",
    'LEAFLET_ATTACHMENT_FILE': "/leaflet.xml",
    'SMPC_ATTACHMENT_FILE': "/smpc.xml",
    "ISSUER_FILE_PATH": "/myKeys/issuer.json",
    "WALLET_HOLDER_FILE_PATH": "/myKeys/holder.json",
    "WALLET_DID_PATH": "/myKeys/did",
    "WALLET_CREDENTIAL_FILE_PATH": "/myKeys/credential.json",
    "SSAPP_HOLDER_FILE_PATH": "/apps/dsu-fabric-ssapp/myKeys/holder.json",
    "SSAPP_CREDENTIAL_FILE_PATH": "/apps/dsu-fabric-ssapp/myKeys/credential.json",
    EPI_ADMIN_GROUP: "ePI_Administration_Group",
    EPI_WRITE_GROUP: "ePI_Write_Group",
    EPI_READ_GROUP: "ePI_Read_Group",
    'DID_GROUP_MAP': {
        'ePI_Read_Group': "ePI Read Group",
        'ePI_Write_Group': "ePI Write Group",
        'ePI_Administration_Group': "ePI Administration Group",
    },
    API_MESSAGE_TYPES: {
        PRODUCT: "Product",
        BATCH: "Batch",
        PRODUCT_PHOTO: "ProductPhoto",
        EPI: {LEAFLET: "leaflet", SMPC: "smpc"}
    },
    EPI_ACTIONS: {
        ADD: "add",
        UPDATE: "update",
        DELETE: "delete"
    },
    MESSAGE_TYPES: {
        USER_LOGIN: "userLogin",
        USER_REMOVED: "userRemoved",
        RECEIVED_APPROVAL: "receivedApproval",
        DID_CREATED: "didCreated",
        ADD_MEMBER_TO_GROUP: "AddMemberToGroup"
    },
    IDENTITY_KEY: "did",
    CREDENTIAL_KEY: "credential",
    CREDENTIAL_DELETED: "deleted",
    NOTIFICATION_TYPES: {
        WARN: "warn",
        INFO: "info",
        ERROR: "error"
    },
    HTML_EVENTS: {
        CLOSED: "closed",
        CONFIRMED: "confirmed",
        SEARCH: "search",
        CLICK: "click",
        SLOTCHANGE: "slotchange",
        FOCUSOUT: "focusout",
        CHANGE: "change",
        UPLOADPRODUCTS: "uploadProducts"
    },
    USER_RIGHTS: {
        READ: "readonly",
        WRITE: "readwrite"
    },
    AUDIT_LOG_TYPES: {
        USER_ACCESS: "userAccess",
        USER_ACCTION: "userAction"
    },
    AUDIT_OPERATIONS: {
        EPI: ['Added Leaflet', 'Updated Leaflet'],
        PHOTO: ['Added ProductPhoto', 'Updated ProductPhoto']
    },
    MODEL_LABELS_MAP: {
        PRODUCT: {
            productCode: "Product Code",
            inventedName: "Brand/Invented name",
            nameMedicinalProduct: "Name of Medicinal Product",
            internalMaterialCode: "Internal material code",
            strength: "Strength",
            photo: "Product Photo",
            productRecall: "Mark Product as Recalled",
            recalled: "Yes",
            /*         patientLeafletInfo: "Patient Specific Information Leaflet",*/
            markets: "Markets management",
            genericNameProduct: "Generic Name",
            // marketingAuthorizationNumber: "Marketing Authorization Number",
            // dateOfFirstAuthorization: "Date of first authorization",
        },
        BATCH: {
            batchNumber: "Batch",
            packagingSiteName: "Packaging site name",
            expiryDate: "Expiry date",
            enableExpiryDay: "Enable day selection",
            gtin: "Product Code",
            productName: "Product Brand/Invented name",
            batchRecall: "Mark Batch as Recalled",
            recalled: "Yes",
            importLicenseNumber: "Import License Number", 
            manufacturerName: "Manufacturer Name",
            dateOfManufacturing: "Date of Manufacturing",
            manufacturerAddress1: "Address Line 1",
            manufacturerAddress2: "Address Line 2",
            manufacturerAddress3: "Address Line 3",
            manufacturerAddress4: "Address Line 4",
            manufacturerAddress5: "Address Line 5",
        }
    },
    OBJECT_AVAILABILITY_STATUS: {
        FREE_OBJECT: "FREE_OBJECT",
        EXTERNAL_OBJECT: "EXTERNAL_OBJECT",
        MY_OBJECT: "MY_OBJECT",
        RECOVERY_REQUIRED: "RECOVERY_REQUIRED"
    },

}
