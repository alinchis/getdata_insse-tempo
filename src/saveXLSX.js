// save data to XLSX files

// import libraries
const fs = require('fs-extra');
const XLSX = require('xlsx');
const cliProgress = require('cli-progress');

// paths
const downloadDate = '2022-09-18';
const inPath = `../${downloadDate}`;
const indexListPath = `${inPath}/metadata/indexList.csv`;
const tablesPath = `${inPath}/tables`;
const xlsxOutPath = `${inPath}/XLSX`;
const xlsxCtiesOutPath = `${inPath}/XLSX_counties`;
const csvOutPath = `${inPath}/CSV`;
const csvCtiesOutPath = `${inPath}/CSV_counties`;


// ////////////////////////////////////////////////////////////////////////////////////////////
// // METHODS

// /////////////////////////////////////////////////////////////////////
// create path
function createPath(index, itemPath) {
    // create path
    try {
      fs.ensureDirSync(itemPath);
      console.log(`${index} >>> PATH:\n ${itemPath}\n successfully created!`);
    } catch (err) {
      console.error(err);
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
  }
  // else return empty object
  console.log('\x1b[31m%s\x1b[0m',`ERROR: ${filePath} file NOT found!`);
  return [];
}

// /////////////////////////////////////////////////////////////////////
// save xlsx metadata files
function saveXlsxMetadataFiles(indexString, xlsxPath, xlsxCtiesPath, mdData, tablePrefix) {
  // create XLSX metadata file if necessary
  if (!fs.existsSync(`${xlsxPath}/_metadata.xlsx`) && !fs.existsSync(`${xlsxCtiesPath}/_metadata.xlsx`)) {
    console.log(`${indexString} >>> create metadata file:\n ${xlsxPath}/_metadata.xlsx`);
    // save current folder metadata file
    // create new workbook
    const mdwb = XLSX.utils.book_new();
    // create new worksheet
    const mdwsName = `${tablePrefix} Metadata`;
    const mdwsData = XLSX.utils.aoa_to_sheet(mdData);
    XLSX.utils.book_append_sheet(mdwb, mdwsData, mdwsName);
    XLSX.writeFile(mdwb, `${xlsxPath}/_metadata.xlsx`);
    XLSX.writeFile(mdwb, `${xlsxCtiesPath}/_metadata.xlsx`);
  }
}

// /////////////////////////////////////////////////////////////////////
// save csv metadata files
function saveCsvMetadataFiles(indexString, csvPath, csvCtiesPath, mdData) {
  // create CSV metadata file if necessary
  if (!fs.existsSync(`${csvPath}/_metadata.csv`) && !fs.existsSync(`${csvPath}/_metadata.csv`)) {
    console.log(`${indexString} >>> create metadata file:\n ${csvPath}/_metadata.csv`);
    // save current folder metadata file
    fs.writeFileSync(`${csvPath}/_metadata.csv`, `${mdData.map(item => item.join(';')).join('\n')}`);
    fs.writeFileSync(`${csvCtiesPath}/_metadata.csv`, `${mdData.map(item => item.join(';')).join('\n')}`);
  }
}

// /////////////////////////////////////////////////////////////////////
// locality table > extract siruta code in separate column
function tableExtractSirutaColumn(indexString, dataGranularity, csvData) {
  // if CSV file has 'localitate' level data, split 'Localitati' column into 'SIRUTA' + 'Localitati'
  if (dataGranularity === 'localitate') {
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
      }
    });
    console.log(`${indexString} >>> END process SIRUTA`);
    // return new array
    return newTableData;
  }

  // else, return input data
  return csvData;
}

// /////////////////////////////////////////////////////////////////////
// write table to XLSX file
function writeTableToXlsx(indexString, xlsxFilePath, tableData) {
  // if table has less than 1 mil rows, write data to XLSX (XLSX sheet can't have more)
  if (tableData.length < 1000000) {
    // prepare XLSX data
    console.log(`${indexString} >>> XLSX prepare data`);
    // create new workbook
    const wb = XLSX.utils.book_new();
    // create new worksheet
    const wsName = 'Sheet 1';
    const wsData = XLSX.utils.aoa_to_sheet(tableData);
    console.log(`${indexString} >>> XLSX append sheet`);
    XLSX.utils.book_append_sheet(wb, wsData, wsName);

    // save XLSX file
    console.log(`${indexString} >>> XLSX file write starting...`);
    XLSX.writeFile(wb, xlsxFilePath);
    console.log(`${indexString} >>> XLSX file write done!`);

    // else, skip XLSX save
  } else {
    console.log(`${indexString} >>> ${tableData.length} rows > 1,000,000 : XLSX file write SKIP!`);
  }
}

// /////////////////////////////////////////////////////////////////////
// split table by counties
function splitTableByCounties(indexString, newTableData) {

}

// /////////////////////////////////////////////////////////////////////
// convert files
function convertFiles(indexListPath, tablesPath) {
  // load list of tables
  const filesArr = readCSV(indexListPath, '#');

  // set counter
  const totalFiles = filesArr.length;
  const notFoundArr = [];

  // for each table in list
  for (let i = 1; i < filesArr.length; i += 1) {
    // variables
    const prefixArr = filesArr[i][0].split('.');
    const l1Folder = `${prefixArr[0]}. ${filesArr[i][1]}`;
    const l2Folder = `${prefixArr[0]}.${prefixArr[1]} ${filesArr[i][2]}`;
    const l3Folder = `${prefixArr[2]}. ${filesArr[i][3]}`;
    const xlsxPath = `${xlsxOutPath}/${l1Folder}/${l2Folder}/${l3Folder}`;
    const xlsxFilePath = `${xlsxPath}/${filesArr[i][4]}.xlsx`;
    const xlsxCtiesPath = `${xlsxCtiesOutPath}/${l1Folder}/${l2Folder}/${l3Folder}`;
    const xlsxCtiesFilePath = `${xlsxCtiesPath}/${filesArr[i][4]}.xlsx`;
    const csvPath = `${csvOutPath}/${l1Folder}/${l2Folder}/${l3Folder}`;
    const csvFilePath = `${csvPath}/${filesArr[i][4]}.csv`;
    const csvCtiesPath = `${csvCtiesOutPath}/${l1Folder}/${l2Folder}/${l3Folder}`;
    const csvCtiesFilePath = `${csvCtiesPath}/${filesArr[i][4]}.csv`;
    // create index string for progress indicator purposes
    const indexString = `${i}/${filesArr.length - 1} :: ${filesArr[i][0]} ${filesArr[i][4]}`;
    // console.log(xlsxPath);

    // create paths
    createPath(indexString, csvPath);
    createPath(indexString, csvCtiesPath);
    createPath(indexString, xlsxPath);
    createPath(indexString, xlsxCtiesPath);

    // ////////////////////////////////////////////////////////////////////
    // prepare metadata file
    console.log(`${indexString} >>> create metadata file array: START...`);
    const mdData = filesArr
      .filter(item => item[0] === 'prefix' || item[0] === filesArr[i][0])
      .map(item => item.slice(4));
    console.log(`${indexString} >>> create metadata file array: DONE!`);

    // save xlsx metadata files
    saveXlsxMetadataFiles(indexString, xlsxPath, xlsxCtiesPath, mdData, filesArr[i][0]);

    // save csv metadata files
    saveCsvMetadataFiles(indexString, csvPath, csvCtiesPath, mdData);


    // ////////////////////////////////////////////////////////////////////
    // prepare csv file
    if (fs.existsSync(`${tablesPath}/${filesArr[i][4]}.csv`)) {
      console.log(`${indexString} >>> ${filesArr[i][4]}.csv : file FOUND!`);

      // open CSV file
      const csvData = readCSV(`${tablesPath}/${filesArr[i][4]}.csv`, '#');
      let newTableData = [];

      // process tabels with locality level data
      newTableData = tableExtractSirutaColumn(indexString, filesArr[i][9], csvData);

      // write table to CSV file
      console.log(`${indexString} >>> write CSV file starting ...`);
      fs.writeFileSync(csvFilePath, `${newTableData.map(item => item.join(';')).join('\n')}`);
      console.log(`${indexString} >>> write CSV file finished!`);

      // write table to XLSX file
      if (!fs.existsSync(xlsxFilePath)) writeTableToXlsx(indexString, xlsxFilePath, newTableData);

      // prepare counties csv files
      // const countiesTablesArr = splitTableByCounties(indexString, newTableData);

      // prepare counties xlsx files

    } else {
      console.log(`${indexString} >>> ${filesArr[i][4]}.csv : file NOT FOUND!`);
      notFoundArr.push(filesArr[i][4]);
    }
  }

  // print summary
  console.log('\n\n@convertFile > Summary:');
  console.log(`\t> files total: ${totalFiles}`);
  console.log(`\t> files found: ${totalFiles - notFoundArr.length}`);
  console.log(`\t> files missing: ${notFoundArr.length}`);
  console.log('\n@convertFile > Missing Tables:');
  console.log(notFoundArr);
  console.log('\n\n');
}


// ////////////////////////////////////////////////////////////////////////////
// // MAIN FUNCTION

function main() {
  console.table(process.argv);

  // help text
  const helpText = '\n Available commands:\n\n\
    1. -h or --help : display help text\n\
    2. -c or --convert : convert all files from CSV to XLSX\n';

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
    convertFiles(indexListPath, tablesPath);

  // else print help
  } else {
    console.log(helpText);
  }

}


// ////////////////////////////////////////////////////////////////////////////
// // RUN MAIN

main();
