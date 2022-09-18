// extract data from CSV tables

// import libraries
const fs = require('fs-extra');

// paths
const downloadDate = '2021-02-09';
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
}

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
}

// /////////////////////////////////////////////////////////////////////
// load csv file
function readCSV(filePath, delimiter=',') {
  // if file is found in path
  if (fs.existsSync(filePath)) {
    // return parsed file
    const newArray = fs.readFileSync(filePath, 'utf8').split('\n');
    return newArray.filter(line => line).map(line => line.replace(/"/gm, '').split(delimiter));
  };
  // else return empty object
  console.log('\x1b[31m%s\x1b[0m',`ERROR: ${filePath} file NOT found!`);
  return [];
}

// ///////////////////////////////////////////////////////////////////////////////////////
// // localities table > save siruta on separate column
function tableExtractSirutaColumn(indexString, csvData) {
  console.log(`${indexString} >>> START process SIRUTA`);

  // find column index and name
  //  console.log(csvData[0]);
  const locIndex = csvData[0].map(item => item.trim()).indexOf('Localitati');
  const ctyIndex = csvData[0].map(item => item.trim()).indexOf('Municipii si orase');
  const colIndex = locIndex > ctyIndex ? locIndex : ctyIndex;
  const colName = locIndex > ctyIndex ? 'Localitati' : 'Municipii si orase';
  console.log(`${colIndex} :: ${colName}`);

  // process line by line, extract SIRUTA code, save into new array
  const newTableData = csvData.map((line, index) => {
    // if header line
    if (index === 0) {
      // insert new column header
      const newHeader = line;
      newHeader.splice(colIndex, 0, 'SIRUTA');
      newHeader[colIndex + 1] = colName;
      return `"${newHeader.join('","')}"`;
      // if data line
    } else {
      // split column value
      const currName = line[colIndex];
      let re = /((?<siruta>\d+)\s)?(?<uat>.*)/gm;
      const matchedRE = re.exec(currName);
      const siruta = matchedRE.groups.siruta || '';
      const uat = matchedRE.groups.uat;
      const newLine = line;
      newLine.splice(colIndex, 0, siruta);
      newLine[colIndex + 1] = uat;
      // console.log(newLine);
      return `"${newLine.join('","')}"`;;
    }
  });
  console.log(`${indexString} >>> END process SIRUTA`);
  // return new array
  return newTableData;
}

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

  // write new index file, containing only the 'localitate' level tables
  const newIndexesTable = locLevelTables.map((row) => {
    const newRow = row.join('","');
    return `"${newRow}"`;
  });
  fs.writeFileSync(`${outPath}/indexList.csv`, newIndexesTable.join('\n'));

  // for each table, filter the given county
  locLevelTablesNames.forEach((tableName, index) => {
    // read file from folder
    const filePath = `${inPath}/tables/${tableName}.csv`;

    // if file is found in path
    if (fs.existsSync(filePath)) {
      // return parsed file
      // const tableData = fs.readFileSync(filePath, 'utf8').split('\n');
      const tableData = readCSV(filePath, '#');
      console.log(`${tableName} :: file read successfully`);

      // // process line by line, extract SIRUTA code, save into new array
      // const newTableData = tableData.map((line, index) => {
      //   // if header line
      //   if (index === 0) {
      //     let newLine = line.replace(/#(Localitati)\s*#/gm, '#SIRUTA#$1#');
      //     newLine = newLine.replace(/#(Municipii si orase)\s*#/gm, '#SIRUTA#$1#');
      //     const returnLine = newLine.split('#');
      //     return `"${returnLine.join('","')}"`;
      //
      //   // if data line
      //   } else {
      //     const newLine = line.replace(/#(\d{5,})\s([^#]+)#/, '#$1#$2#');
      //     const returnLine = newLine.split('#');
      //     return `"${returnLine.join('","')}"`;
      //   }
      // });

      // save siruta to separate column
      const newTableData = tableExtractSirutaColumn(tableName, tableData);
      // console.log(newTableData);

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
    }

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