// create permutations for each table

// import libraries
const fs = require('fs');

// ////////////////////////////////////////////////////////////////////////////////////////////
// // METHODS

// /////////////////////////////////////////////////////////////////////
// load table headers from file [tempoL3.json]
function readFile(filePath) {
  // if file is found in path
  if (fs.existsSync(filePath)) {
    // return parsed file
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  };
  // else return empty object
  console.log('\x1b[31m%s\x1b[0m',`ERROR: tempoL file NOT found!`);
  return {};
};

// /////////////////////////////////////////////////////////////////////
// get table prefix
function getTablePrefix(folderPath, table) {
  // read table ancestors from tempaL1 file
  const tempoL1 = readFile(`${folderPath}/tempoL1.json`, 'utf8');
  const ancestors = tempoL1.level1;
  const tableCode = table.ancestors[3].code;
  const parentCode = table.ancestors[2].code;
  const tableIndex = ancestors.filter(item => item.context.code === tableCode)[0].context.name.split(' ')[0].replace('.', '');
  const ancestorPrefix = ancestors.filter(item => item.context.code === parentCode)[0].context.name.split(' ')[0];
  const tablePrefix = `${ancestorPrefix}.${tableIndex}`;
  // return value
  return tablePrefix;
};

// /////////////////////////////////////////////////////////////////////
// get times array
function getTimesArray(item) {
  // times intervals array
  const timesArr = ['Luni', 'Trimestre', 'Perioade'];
  // filter only years column
  const yearsColumn = item.dimensionsMap.filter((column) => column.label === 'Ani')[0];
  // if years column is found
  if (yearsColumn) {
    return yearsColumn;
  // if years column is not found
  } else {
    // search for other times intervals
    const timesColumn = item.dimensionsMap.filter((column) => timesArr.includes(column.label))[0];
    if (timesColumn) {
      return timesColumn;
    // if column is not found in times intervals array, print table info, for manual check only
    } else {
      console.log(`${item.tableName}::${item.periodicitati}`);
      return ['', ''];
    }
  };
};


// ////////////////////////////////////////////////////////////////////////////////////////////
// // EXPORTS
module.exports = async (downloadDate) => {
  console.log('\x1b[34m%s\x1b[0m', `PROGRESS: Create Headers File\n`);
  // save path
  const inPath = `./${downloadDate}/metadata`;
  // read file
  const tempoL3 = readFile(`${inPath}/tempoL3.json`, 'utf8').level3;
  console.log('\x1b[36m%s\x1b[0m', `INFO: tempo level 3 array length = ${tempoL3.length}\n`);

  // for each table create permutation array and save it to file
  const headersArray = tempoL3.map((table) => {
    // get prefix
    const tablePrefix = getTablePrefix(inPath, table);
    // console.log(tablePrefix);
    // get times/values array
    const timesArray = getTimesArray(table);
    // get keys array
    const keysArray = table.dimensionsMap.slice(0, timesArray.dimCode - 1).map(col => col.label.trim());
    return {
      tablePrefix,
      tableName: table.tableName,
      keysArray,
      timesArray: timesArray.options.map(item => item.label.trim()),
    };
  });

  // write file
  // console.log(indexArr);
  console.log('\x1b[34m%s\x1b[0m', `PROGRESS: Write Headers Array to file`);
  // write to file
	fs.writeFileSync(`${inPath}/headers.json`, JSON.stringify(headersArray), 'utf8', () => console.log('\x1b[34m%s\x1b[0m', `INFO: Write 'headers.csv' done!\n`));

};