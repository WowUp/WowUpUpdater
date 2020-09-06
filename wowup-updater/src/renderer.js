const { remote } = require('electron');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const { program } = require('commander');
const taskKill = require('taskkill');
const { v4: uuidv4 } = require('uuid');
const rimraf = require('rimraf');
const { spawn } = require('child_process');
const winston = require('winston');

const WOWUP_FOLDER = path.join(remote.process.env.LOCALAPPDATA, 'WowUp', 'Logs');

const logger = winston.createLogger({
  level: 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.File({ filename: path.join(WOWUP_FOLDER, 'wowup-updater.log') }),
  ],
});

program
  .version('1.0.0')
  .option('-o, --origin <path>', 'The current WowUp.exe path', '')
  .option('-u, --update <path>', 'The pending WowUp.zip path', '');

// get the parser to parse after app is packaged...
const processArgs = remote.process.argv;
if (remote.process.env.APP_STAGE !== 'dev') {
  processArgs.splice(1, 0, '.');
}

program.parse(processArgs);

logger.info(program);

if (document.readyState === "complete" || document.readyState === "loaded") {
  contentLoaded();
} else {
  document.addEventListener('DOMContentLoaded', () => { contentLoaded(); }, false);
}

function contentLoaded() {
  setTimeout(() => {
    processUpdate()
      .then()
      .catch(e => {
        logger.error(`${e}`);
      });
  }, 2000);
}

async function processUpdate() {
  let backupPath = '';
  let unzippedDir = '';

  try {
    validateOrigin(program.origin);
    validateUpdate(program.update);

    await killWowUp();

    unzippedDir = unzipFile(program.update);

    backupPath = getBackupPath(program.origin);
    createBackup(program.origin, backupPath);

    moveFiles(unzippedDir, path.dirname(program.origin));

    deleteFile(program.update);

    startWowUp(program.origin);
  } catch (er) {
    logger.error(`${er}`);
    //Check if we made the backup and revert
    if (backupPath && !fs.existsSync(program.Origin) && fs.existsSync(backupPath)) {
      logger.info("Attempting to rollback changes");
      fs.renameSync(backupPath, program.Origin);
    }
  } finally {
    if (unzippedDir && fs.existsSync(unzippedDir)) {
      await deleteDir(unzippedDir);
    }
  }

  logger.info('Finishing');
  remote.app.quit();
}

function deleteFile(filePath) {
  logger.info(`Deleting file ${filePath}`);
  fs.unlinkSync(filePath);
}

function deleteDir(dirPath) {
  logger.info(`Deleting dir ${dirPath}`);
  return new Promise((resolve) => {
    rimraf(dirPath, (err) => {
      if (err) {
        logger.error(`${e}`);
      }
      resolve();
    });
  })
}

function unzipFile(zipPath) {
  logger.info(`Unzipping file ${zipPath}`);

  const dirName = path.dirname(zipPath);
  const tempUnzipDir = path.join(`${dirName}`, uuidv4());

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(tempUnzipDir);

  return tempUnzipDir;
}

function moveFiles(sourcePath, targetPath) {
  const files = fs.readdirSync(sourcePath);

  for (let file of files) {
    logger.info(`Moving file ${file} => ${targetPath}`);
    fs.copyFileSync(path.join(sourcePath, file), path.join(targetPath, file));
  }
}

function startWowUp(path) {
  logger.info('Starting WowUp');
  const out = fs.openSync('./out.log', 'a');
  const err = fs.openSync('./out.log', 'a');

  const child = spawn(path, [], { stdio: ['ignore', out, err], detached: true });
  child.unref();
}

async function killWowUp() {
  logger.info('Killing WowUp');
  try {
    await taskKill(['WowUp.exe']);
  } catch (e) {
    if (e.exitCode === 128) {
      return;
    }

    logger.error(`${e}`);
    throw e;
  }
}

function createBackup(originPath, targetPath) {
  logger.info(`Creating backup ${targetPath}`);

  fs.renameSync(originPath, targetPath);
}

function validateOrigin(originPath) {
  if (!originPath || !fs.existsSync(originPath)) {
    throw new Error(`Origin file not found: ${originPath}`);
  }

  if (path.extname(originPath).toLowerCase() !== '.exe') {
    throw new Error(`Invalid origin path, must be an exe file`);
  }
}

function validateUpdate(updatePath) {
  if (!updatePath || !fs.existsSync(updatePath)) {
    throw new Error(`Update file not found: ${updatePath}`);
  }

  if (path.extname(updatePath).toLowerCase() !== ".zip") {
    throw new Error("Invalid update path, must be a zip file");
  }
}

function getBackupPath(exePath) {
  var fileName = path.basename(exePath);
  var dirName = path.dirname(exePath);
  var backupName = `${fileName}.bak`;

  return path.join(dirName, backupName);
}
