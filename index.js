const fs = require('fs-extra');
const glob = require('glob');

// import local modules
const getMetadata = require('./src/getMetadata.js');
const createIndexList = require('./src/createIndexList.js');
const createPermutations = require('./src/createPermutations.js');

// paths
const metadataFolder = 'metadata';
const tablesFolder = 'tables';
const logsFolder = 'logs';
const permutationsFolder = 'permutations';


// ////////////////////////////////////////////////////////////////////////////
// // METHODS

// ////////////////////////////////////////////////////////////////////////////
// helper functions

// create download folder
function createFolder(folderName) {
  if (!fs.existsSync(folderName)){
    fs.mkdirSync(folderName);
    console.log('\x1b[32m%s\x1b[0m', `SUCCESS: Folder \"${folderName}\" was created!`);
  } else {
    console.log('\x1b[31m%s\x1b[0m',`ERROR: Folder \"${folderName}\" already exists!`);
  }
};

// remove download folder and any files inside
function removeFolder(folderName) {
  if (fs.existsSync(folderName)){
    const pathArr = fs.readdirSync(folderName);
    pathArr.forEach((filename) => {
      fs.unlinkSync(`${folderName}/${filename}`);
    });
    fs.rmdirSync(folderName);
    console.log('\x1b[32m%s\x1b[0m', `SUCCESS: Folder \"${folderName}\" was removed!`);
  } else {
    console.log('\x1b[31m%s\x1b[0m',`ERROR: Folder \"${folderName}\" does NOT exist!`);
  }
};

// init sub-folders for new download
function initFolders(today) {
  // create current date root folder
  createFolder(today);
  // create metadata folder
  createFolder(`${today}/${metadataFolder}`);
  // create tables folder
  createFolder(`${today}/${tablesFolder}`);
  // create logs folder
  createFolder(`${today}/${logsFolder}`);
  // create permutations folder
  createFolder(`${today}/${permutationsFolder}`);
}

// get current date - formated
function getCurrentDate() {
  const today = new Date().toISOString();
  const regex = /^(\d{4}-\d{2}-\d{2})/g;
  // return formated string
  return today.match(regex)[0];
};

// get most recent download folder
function getRecentFolder(today) {
  // create folder pattern
  const folderPattern = '????-??-??';
  // test if folders exist for given pattern
  const foldersArray = glob.sync(folderPattern, { cwd: './' })
  if (foldersArray.length > 0) {
    console.log('Download folders array:');
    console.log(foldersArray);
    const diffArray = foldersArray.map((item) => {
      const itemDate = new Date(item);
      const currDate = new Date(today);
      return currDate - itemDate;
    });
    const folderIndex = diffArray.indexOf(Math.min(...diffArray));
    // return folder name
    return foldersArray[folderIndex];
  } else {
    return '';
  };
};

// check if metadata files are present in download folder
function checkMetadata(today) {
  const metadataPath = `${today}/${metadataFolder}`;
  // check if metadata folder exists
  if (fs.existsSync(metadataPath)){
    console.log('\x1b[34m%s\x1b[0m', `INFO: Metadata folder found!\n`);
    // check if json files are present
    const level1 = fs.existsSync(`${metadataPath}/tempoL1.json`);
    const level2 = fs.existsSync(`${metadataPath}/tempoL2.json`);
    const level3 = fs.existsSync(`${metadataPath}/tempoL3.json`);
    // if all files are present
    if (level1 && level2 && level3) {
      console.log('\x1b[34m%s\x1b[0m', `INFO: All metadata files are found!\n`);
      // return true
      return true;
    // if some files are missing
    } else {
      console.log('\x1b[34m%s\x1b[0m', `INFO: Some metadata files are missing!\n`);
      // return false
      return false;
    }
  // metadata folder is not found, return false
  } else {
    console.log('\x1b[34m%s\x1b[0m', `INFO: Metadata folder does not exist!\n`);
    return false;
  };
};

// check if index list exists
function checkIndexList(today) {
  const indexPath = `${today}/${metadataFolder}`;
  // check if metadata folder exists
  if (fs.existsSync(indexPath)){
    console.log('\x1b[34m%s\x1b[0m', `INFO: Metadata folder found!\n`);
    // check if index list file is present
    if (fs.existsSync(`${indexPath}/indexList.csv`)) {
      console.log('\x1b[34m%s\x1b[0m', `INFO: Index List file found!\n`);
      // return true
      return true;
    // if index list file is missing
    } else {
      console.log('\x1b[34m%s\x1b[0m', `INFO: Index List File is missing!\n`);
      // return false
      return false;
    }
  // metadata folder is not found, return false
  } else {
    console.log('\x1b[34m%s\x1b[0m', `INFO: Metadata folder does not exist!\n`);
    return false;
  };
};

// check for existing permutations
function checkPermutations(todax) {

};


// ////////////////////////////////////////////////////////////////////////////
// // MENU functions

// start new download
function newDownload(today) {
  console.log('\x1b[34m%s\x1b[0m', `INFO: New download started!\n`);

  // remove current date folder, if exists
  fs.removeSync(today);
  // initiate new folders
  initFolders(today);
  // get metadata
  getMetadata(today);
  // create index list
  createIndexList(today);
  // for each item in index list create query permutations
  createPermutations(today);
  // start downloads

};

// continue most recent download
function continueDownload(today) {
  console.log('\x1b[34m%s\x1b[0m', `INFO: Continue most recent download\n`);
  // request most recent folder
  const currentDownloadFolder = getRecentFolder(today);
  // if a valid folder is found
  if (currentDownloadFolder !== '') {
    console.log('\x1b[32m%s\x1b[0m',`SUCCESS: Recent download folder found >>> \"${currentDownloadFolder}\"\n`);
    // // the stge of downloads
    // check for metadata files
    if (!checkMetadata(currentDownloadFolder)) {
      getMetadata(currentDownloadFolder);
    };
    // check for index list
    if (!checkIndexList(currentDownloadFolder)) {
      createIndexList(currentDownloadFolder);
    };
    // check permutations
    if (!checkPermutations(currentDownloadFolder)) {
      createPermutations(currentDownloadFolder);
    }
    // check logs for progress

    // continue downloads


  // if no downloads folder is found  
  } else {
    console.log('\x1b[31m%s\x1b[0m',`ERROR: NO download folders found!`);
  }
};


// ////////////////////////////////////////////////////////////////////////////
// // MAIN function
function main() {
  // get current date
  const today = getCurrentDate();

  // help text
  const helpText = `\n Available commands:\n\n\
  1. -h : display help text\n\
  2. -d : start new download\n\
          !!! removes all files and folders in the current date: \'${today}\' folder\n\
  3. -c : continue the most recent download\n`;

  // get command line arguments
  const arguments = process.argv;
  console.log('\x1b[34m%s\x1b[0m', '\n@START: CLI arguments >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
  console.table(arguments);
  console.log('\n');

  // get third command line argument
  // if argument is missing, -h is set by default
  const mainArg = process.argv[2] || '-h';

  // run requested command
  // 1. if argument is 'h' or 'help' print available commands
  if (mainArg === '-h') {
    console.log(helpText);

  // 2. else if argument is 'd'
  } else if (mainArg === '-d') {
    // start new download
    newDownload(today);

  // 3. else if argument is 'c'
  } else if (mainArg === '-c') {
    // continue most recent download
    continueDownload(today);

    // else print help
  } else {
    console.log(helpText);
  }

}


// ////////////////////////////////////////////////////////////////////////////
// // MAIN
main();
