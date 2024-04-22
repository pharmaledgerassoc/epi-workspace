const apihubModule = require("apihub");

const fs = require('fs').promises;
const path = require('path');
const process = require("process");
const apihubRootFolder = apihubModule.getServerConfig().storage;
const getBricksStoragePathForDomain = (domain) => {
    return path.join(apihubRootFolder, "external-volume", "domains", domain, "brick-storage");
}

async function moveBricksForDomain(domain) {
    const BRICK_STORAGE_PATH = getBricksStoragePathForDomain(domain);
    console.log("Starting to move bricks from", BRICK_STORAGE_PATH, "for domain", domain)
    try {
        const subfolders = await fs.readdir(BRICK_STORAGE_PATH);

        for (const subfolder of subfolders) {
            if(subfolder.length > 2) {
                const subfolderPath = path.join(BRICK_STORAGE_PATH, subfolder);
                const brickFiles = await fs.readdir(subfolderPath);

                for (const brickName of brickFiles) {
                    const newSubfolderName = brickName.substring(0, 2);
                    const newSubfolderPath = path.join(BRICK_STORAGE_PATH, newSubfolderName);

                    // Create new subfolder if it doesn't exist
                    await fs.mkdir(newSubfolderPath, {recursive: true});

                    // Move brick file to new subfolder
                    const oldBrickPath = path.join(subfolderPath, brickName);
                    const newBrickPath = path.join(newSubfolderPath, brickName);
                    await fs.rename(oldBrickPath, newBrickPath);
                }

                try {
                    await fs.rm(subfolderPath, {recursive: true, maxRetries: 5, force: true});
                } catch (error) {
                    // fake error dir not empty
                    console.error(`Error removing old subfolder ${subfolderPath}: ${error}`);
                }
            }
        }

        console.log("Finished moving bricks for domain", domain);
    } catch (error) {
        console.error('Error moving bricks:', error);
    }
}

const MIGRATION_SECRET_NAME = "brick-storage-migration-version";
const checkIfMigrationIsNeeded = async () => {
    const secretsServiceInstance = await apihubModule.getSecretsServiceInstanceAsync(apihubRootFolder);
    let secret;
    try {
        secret = secretsServiceInstance.readSecretFromDefaultContainerSync(MIGRATION_SECRET_NAME);
    } catch (e) {
        // ignored and handled below
    }
    if (secret && secret === process.env.EPI_VERSION) {
        return false;
    }

    return true;
}

async function countItems(dir) {
    let count = { directories: 0, files: 0 };

    try {
        const items = await fs.readdir(dir, { withFileTypes: true });
        for (let item of items) {
            if (item.isDirectory()) {
                count.directories++;
                const subDir = path.join(dir, item.name);
                const subCount = await countItems(subDir);
                count.directories += subCount.directories;
                count.files += subCount.files;
            } else if (item.isFile()) {
                count.files++;
            }
        }
    } catch (err) {
        console.error(`Error reading directory: ${dir}`, err);
    }

    return count;
}

const moveBricks = async () => {
    const secretsServiceInstance = await apihubModule.getSecretsServiceInstanceAsync(apihubRootFolder);
    const domainsPath = path.join(apihubRootFolder, "external-volume", "domains");
    if (!await checkIfMigrationIsNeeded()) {
        console.log("Migration is not needed");
        return;
    }

    const numberOfFoldersAndFilesBeforeMigration = await countItems(domainsPath);
    console.info(0x222,"Number of folders before migration:", numberOfFoldersAndFilesBeforeMigration.directories, "Number of files before migration:", numberOfFoldersAndFilesBeforeMigration.files);
    try {
        await fs.access(domainsPath);
    } catch (e) {
        console.log("No domains found in", domainsPath);
        await secretsServiceInstance.putSecretInDefaultContainerAsync(MIGRATION_SECRET_NAME, process.env.EPI_VERSION);
        console.log("Brick storage migration finished");
        return;
    }
    const domains = await fs.readdir(domainsPath);
    for (const domain of domains) {
        await moveBricksForDomain(domain);
    }

    await secretsServiceInstance.putSecretInDefaultContainerAsync(MIGRATION_SECRET_NAME, process.env.EPI_VERSION);

    console.log("Brick storage migration finished");
    const numberOfFoldersAndFilesAfterMigration = await countItems(domainsPath);
    console.info(0x222, "Number of folders after migration:", numberOfFoldersAndFilesAfterMigration.directories, "Number of files after migration:", numberOfFoldersAndFilesAfterMigration.files);
}

module.exports = moveBricks;