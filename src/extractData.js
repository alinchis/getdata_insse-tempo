// extract data from CSV tables

// import libraries
const fs = require('fs-extra');

// paths
const downloadDate = '2019-06-21';
const inPath = `../${downloadDate}`;
const outPath = `../${downloadDate}/extracts`;

// ////////////////////////////////////////////////////////////////////////////////////////////
// // METHODS

// /////////////////////////////////////////////////////////////////////
// create download folder
function createFolder(folderName) {
  if (!fs.existsSync(folderName)){
    fs.mkdirSync(folderName);
    console.log('\x1b[32m%s\x1b[0m', `SUCCESS: Folder \"${folderName}\" was created!`);
  } else {
    console.log('\x1b[31m%s\x1b[0m',`INFO: Folder \"${folderName}\" already exists, skiping ...`);
  }
};

// /////////////////////////////////////////////////////////////////////
// load json file
function readJSON(filePath) {
  // if file is found in path
  if (fs.existsSync(filePath)) {
    // return parsed file
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  };
  // else return empty object
  console.log('\x1b[31m%s\x1b[0m',`ERROR: ${filePath} file NOT found!`);
  return {};
};

// /////////////////////////////////////////////////////////////////////
// load csv file
function readCSV(filePath, delimiter) {
  // if file is found in path
  if (fs.existsSync(filePath)) {
    // return parsed file
    const newArray = fs.readFileSync(filePath, 'utf8').split('\n');
    return newArray.filter(line => line).map(line => line.split(delimiter || ','));
  };
  // else return empty object
  console.log('\x1b[31m%s\x1b[0m',`ERROR: ${filePath} file NOT found!`);
  return [];
};

// ///////////////////////////////////////////////////////////////////////////////////////
// // extract counties from files that have localities level data

function extractCounties(counties) {
  console.log('\x1b[33m%s\x1b[0m', '@extractCounties :: START\n');
  // create counties folders
  counties.forEach((county) => {
    createFolder(`${outPath}/${county.code}`);
  });

  // read index table from file
  const indexTable = readCSV(`${inPath}/metadata/indexList.csv`, ';');

  // filter the tables containing localities data ( 86 tables )
  const locLevelTables = indexTable.filter(row => row[9] === 'localitate' || row[9] === 'data-granularity');
  // extract only the tables names
  const locLevelTablesNames = locLevelTables.map(row => row[4]);
  console.log(`\nTOTAL COUNT = ${locLevelTables.length}\n`);
  // console.log(locLevelTablesNames);

  // write new index file, containing only the 'lacalitate' level tables
  fs.writeFileSync(`${outPath}/indexList.csv`, `${locLevelTables.map(row => row.join(';')).join('\n')}`);

  // for each table, filter the given county
  locLevelTablesNames.forEach((tableName, index) => {
    // read file from folder
    const filePath = `${inPath}/tables/${tableName}.csv`;

    // if file is found in path
    if (fs.existsSync(filePath)) {
      // return parsed file
      const tableData = fs.readFileSync(filePath, 'utf8').split('\n');
      console.log(`${tableName} :: file read successfully`);

      // process line by line, extract SIRUTA code, save into new array
      const newTableData = tableData.map((line, index) => {
        // if header line
        if (index === 0) {
          let newLine = line.replace(/;(Localitati)\s*;/gm, ';SIRUTA;$1;');
          return newLine.replace(/;(Municipii si orase)\s*;/gm, ';SIRUTA;$1;');

        // if data line
        } else {
          return line.replace(/;(\d{5,})\s([^;]+);/, ';"$1";"$2";');
        };
      });

      // write new table data to file
      counties.forEach((county) => {
        // filter table for current county
        const filteredTable = newTableData.filter((line, index) => {
          if (index === 0 || line.includes(county.name)) return true;
          return false;
        });
        // write new file to county folder
        fs.writeFileSync(`${outPath}/${county.code}/${tableName}.csv`, `${filteredTable.join('\n')}`);
      });
    };


  });

  // end
  console.info('\x1b[33m%s\x1b[0m', `\nProcessing DONE.\n`);
}


// ////////////////////////////////////////////////////////////////////////////
// // MAIN FUNCTION

function main() {
  console.table(process.argv);

  // help text
  const helpText = '\n Available commands:\n\n\
1. -h or --help : display help text\n\
2. -e or --extract : extract desired counties (SJ, SV, TL) in separate folders and files (folders must be created manually)\n\
  ';

  // set extracts
  const exTable = [
      { name: 'Suceava', code: 'SV' },
      { name: 'Salaj', code: 'SJ' },
      { name: 'Tulcea', code: 'TL' },
      { name: 'Cluj', code: 'CJ' },
  ];
  const ctyIds = [
      'SV',
      'SJ',
      'TL',
      'CJ',
  ];

  // get third command line argument
  const argument = process.argv[2] || '--help';
  let batchArg = 0;
  const tableIds = [];
  let countiesIds = [];

  if (process.argv[3] && process.argv[3].length === 1) {
      batchArg = process.argv[3];
  } else if (process.argv[3] && process.argv[3].length > 5) {
      tableIds.push(process.argv[3]);
      if (process.argv[4] || ctyIds.includes(process.argv[4])) {
          countiesIds.push(process.argv[4]);
      } else {
          countiesIds = ctyIds;
      }
  }

  console.log('\x1b[34m%s\x1b[0m', `\n@extractData >>>>>>> START\n`);

  // run requested command
  // 1. if argument is 'h' or 'help' print available commands
  if (argument === '-h' || argument === '--help') {
    console.log(helpText);

  // 2. else if argument is 'e' or 'extract', check which tables have 'luni' for time column
  } else if (argument === '-e' || argument === '--extract') {
    // create main folder in the provided download date folder
    createFolder(outPath);
    // extract counties from the localities level tables
    extractCounties(exTable);

  // else print help
  } else {
    console.log(helpText);
  }

}


// ////////////////////////////////////////////////////////////////////////////
// // RUN MAIN

main();