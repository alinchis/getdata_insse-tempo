// save data to XLSX files

// import libraries
const fs = require('fs-extra');
const XLSX = require('xlsx');
const cliProgress = require('cli-progress');

// paths
const downloadDate = '2020-05-05';
const inPath = `../${downloadDate}`;
const indexListPath = `${inPath}/metadata/indexList.csv`;
const tablesPath = `${inPath}/tables`;
const outPath = `${inPath}/XLSX`;

// ////////////////////////////////////////////////////////////////////////////////////////////
// // METHODS

// /////////////////////////////////////////////////////////////////////
// create path
function createPath(index, itemPath) {

    // create path
    try {
      fs.ensureDirSync(itemPath)
      console.log(`${index} >>> PATH:\n ${itemPath}\n successfully created!`)
    } catch (err) {
      console.error(err)
    }
  }

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

// /////////////////////////////////////////////////////////////////////
// convert files
function convertFiles(indexListPath, tablesPath, outPath) {
  // load list of tables
  const filesArr = readCSV(indexListPath, ';');

  // for each table in list
  for (let i = 1; i < filesArr.length; i += 1) {
    // variables
    const prefixArr = filesArr[i][0].split('.');
    const l1Folder = `${prefixArr[0]}. ${filesArr[i][1]}`;
    const l2Folder = `${prefixArr[0]}.${prefixArr[1]} ${filesArr[i][2]}`;
    const l3Folder = `${prefixArr[2]}. ${filesArr[i][3]}`;
    const xlsxPath = `${outPath}/${l1Folder}/${l2Folder}/${l3Folder}`;
    const xlsxFilePath = `${xlsxPath}/${filesArr[i][4]}.xlsx`;
    // create index string for progress indicator purposes
    const indexString = `${i}/${filesArr.length - 1} :: ${filesArr[i][0]} ${filesArr[i][4]}`;
    // console.log(xlsxPath);
    // create path
    createPath(indexString, xlsxPath);

    // create metadata file if necessary
    const mdFilePath = `${xlsxPath}/_metadata.xlsx`;
    if (!fs.existsSync(mdFilePath)) {
      console.log(`${indexString} >>> create metadata file:\n ${xlsxPath}/_metadata.xlsx`);
      // prepare metadata file
      const mdData = filesArr
        .filter(item => item[0] === 'prefix' || item[0] === filesArr[i][0])
        .map(item => item.slice(4));
      
      // save current folder metadata file
      // create new workbook
      const mdwb = XLSX.utils.book_new();
      // create new worksheet
      const mdwsName = `${filesArr[i][0]} Metadata`;
      const mdwsData = XLSX.utils.aoa_to_sheet(mdData);
      XLSX.utils.book_append_sheet(mdwb, mdwsData, mdwsName);
      XLSX.writeFile(mdwb, mdFilePath);
    };

    // if current table XLSX file does not exist, crate and save
    if (!fs.existsSync(xlsxFilePath)) {
      // open CSV file
      const csvFilePath = `${tablesPath}/${filesArr[i][4]}.csv`;
      const csvData = readCSV(csvFilePath, '#');
      let newTableData = [];

      // if CSV file has 'localitate' level data, split 'Localitati' column into 'SIRUTA' + 'Localitati'
      if (filesArr[i][9] === 'localitate') {
        console.log(`${indexString} >>> START process SIRUTA`);

        // find column index and name
        //  console.log(csvData[0]);
        const locIndex = csvData[0].map(item => item.trim()).indexOf('Localitati');
        const ctyIndex = csvData[0].map(item => item.trim()).indexOf('Municipii si orase');
        colIndex = locIndex > ctyIndex ? locIndex : ctyIndex;
        colName = locIndex > ctyIndex ? 'Localitati' : 'Municipii si orase';
        console.log(`${colIndex} :: ${colName}`);

        // process line by line, extract SIRUTA code, save into new array
        newTableData = csvData.map((line, index) => {
          // if header line
          if (index === 0) {
            // insert new column header
            const newHeader = line;
            newHeader.splice(colIndex, 0, 'SIRUTA');
            newHeader[colIndex + 1] = colName;
            return newHeader;
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
            return newLine;
          };
        });
        console.log(`${indexString} >>> END process SIRUTA`);
         // write new file to CSV file
        console.log(`${indexString} >>> write CSV file starting ...`);
        fs.writeFileSync(`${inPath}/extracts/RO-localities/${filesArr[i][4]}.csv`, `${newTableData.map(item => item.join(';')).join('\n')}`);
        console.log(`${indexString} >>> write CSV file finished!`);

      } else {
        // else pass the current table
        newTableData = csvData;
      };

      // prepare XLSX data
      console.log(`${indexString} >>> XLSX prepare data`);
      // create new workbook
      const wb = XLSX.utils.book_new();
      // create new worksheet
      const wsName = 'Sheet 1';
      const wsData = XLSX.utils.aoa_to_sheet(newTableData);
      console.log(`${indexString} >>> XLSX append sheet`);
      XLSX.utils.book_append_sheet(wb, wsData, wsName);
      
      // save XLSX file
      console.log(`${indexString} >>> XLSX file write starting...`);
      XLSX.writeFile(wb, xlsxFilePath);
      console.log(`${indexString} >>> XLSX file write done!`);
    };
  };
};

// ////////////////////////////////////////////////////////////////////////////
// // MAIN FUNCTION

function main() {
  console.table(process.argv);

  // help text
  const helpText = '\n Available commands:\n\n\
1. -h or --help : display help text\n\
2. -c or --convert : convert all files from CSV to XLSX\n\
  ';

  // get third command line argument
  const argument = process.argv[2] || '--help';
  let batchArg = 0;

  console.log('\x1b[34m%s\x1b[0m', `\n START >>>>>>>\n`);

  // run requested command
  // 1. if argument is 'h' or 'help' print available commands
  if (argument === '-h' || argument === '--help') {
    console.log(helpText);

  // 2. else if argument is 'e' or 'extract', check which tables have 'luni' for time column
  } else if (argument === '-c' || argument === '--convert') {
    // extract counties from the localities level tables
    convertFiles(indexListPath, tablesPath, outPath);

  // else print help
  } else {
    console.log(helpText);
  }

}


// ////////////////////////////////////////////////////////////////////////////
// // RUN MAIN

main();