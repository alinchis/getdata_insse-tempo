const fs = require('fs-extra');
const glob = require('glob');


// ////////////////////////////////////////////////////////////////////////////
// // METHODS

// ////////////////////////////////////////////////////////////////////////////
// helper functions

// create folder
function createFolder(folderName) {
  if (!fs.existsSync(folderName)){
    fs.mkdirSync(folderName);
    console.log('\x1b[32m%s\x1b[0m', `SUCCESS: Folder \"${folderName}\" was created!`);
  } else {
    console.log('\x1b[31m%s\x1b[0m',`ERROR: Folder \"${folderName}\" already exists!`);
  }
};

// remove folder and any files inside
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

// init folders for new download
function initFolders(today) {
  // create current date root folder
  createFolder(today);
  // create metadata folder
  createFolder(`${today}/metadata`);
  // create tables folder
  createFolder(`${today}/tables`);
  // create logs folder
  createFolder(`${today}/logs`);
  // create permutations folder
  createFolder(`${today}/permutations`);
}

// get current date - formated
function getCurrentDate() {
  const today = new Date().toISOString();
  const regex = /^(\d{4}-\d{2}-\d{2})/g;
  // return formated string
  return today.match(regex)[0];
};

// get most recent folder
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

// ////////////////////////////////////////////////////////////////////////////
// MENU functions

// start new download
function newDownload(today) {
  console.log('\x1b[34m%s\x1b[0m', `INFO: New download started!\n`);

  // remove current date folder, if exists
  fs.removeSync(today);
  // initiate new folders
  initFolders(today);

};

// continue most recent download
function continueDownload(today) {
  console.log('\x1b[34m%s\x1b[0m', `INFO: Continue most recent download\n`);
  const folderName = getRecentFolder(today);
  if (folderName !== '') {
    console.log('\x1b[32m%s\x1b[0m',`SUCCESS: Recent download folder found >>> \"${folderName}\"`);
  } else {
    console.log('\x1b[31m%s\x1b[0m',`ERROR: NO download folders found!`);
  }
};


// ////////////////////////////////////////////////////////////////////////////
// MAIN function
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
