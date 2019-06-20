// create index list

// import libraries
const fs = require('fs');


// ////////////////////////////////////////////////////////////////////////////////////////////
// // METHODS

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

// get table prefix
function getTablePrefix(folderPath, item) {
  // read table ancestors from tempaL1 file
  const tempoL1 = readFile(`${folderPath}/tempoL1.json`, 'utf8');
  const ancestors = tempoL1.level1;
  const tableCode = item.ancestors[3].code;
  const parentCode = item.ancestors[2].code;
  const tableIndex = ancestors.filter(item => item.context.code === tableCode)[0].context.name.split(' ')[0].replace('.', '');
  const ancestorPrefix = ancestors.filter(item => item.context.code === parentCode)[0].context.name.split(' ')[0];
  const tablePrefix = `${ancestorPrefix}.${tableIndex}`;
  // return value
  return tablePrefix;
};

// get first and last year
function getYears(item) {
  // times intervals array
  const timesArr = ['Luni', 'Trimestre', 'Perioade'];
  // regex patter for year extraction
  const yearRegex = /\d{4}/g;
  // filter only years column
  const yearsColumn = item.dimensionsMap.filter((column) => column.label === 'Ani')[0];
  // if years column is found
  if (yearsColumn) {
    const yearsArr = yearsColumn.options.map((year) => {
      // extract year value from cell
      const yearValue = year.label.match(yearRegex);
      // if year value is not found, print table info, for manual check only
      // if(!yearValue) {
      //   console.log(`${item.tableName}::${year.label}`);
      // };
      // return year value
      return yearValue;
    });
    // return array [min, max] time values
    return [Math.min(...yearsArr), Math.max(...yearsArr)];
  // if years column is not found
  } else {
    // search for other times intervals
    const timesColumn = item.dimensionsMap.filter((column) => timesArr.includes(column.label))[0];
    if (timesColumn) {
      const timesArr = timesColumn.options.map((year) => {
        const timesValue = year.label.match(yearRegex);
        // if times value is not found, print table info, for manual check only
        // if(!timesValue) {
        //   console.log(`${item.tableName}::${year.label}`);
        // };
        // return year value
        return timesValue;
      });
      // return array [min, max] time values
      return [Math.min(...timesArr), Math.max(...timesArr)];
    // if column is not found in times intervals array, print table info, for manual check only
    } else {
      console.log(`${item.tableName}::${item.periodicitati}`);
      return ['', ''];
    }
  };
};

// refactor date
function refactorDate(item) {
  // create new date array
  const newItem = item.split('-');
  // return refactored date value
  return `${newItem[2]}-${newItem[1]}-${newItem[0]}`;
};

// get granularity
function getGranularity(tableName) {
  // check for 'localitati'
  if (tableName.includes('si localitati')) return 'localitate';
  // check for 'judete'
  if (tableName.includes('si judete')) return 'judet';
  // check for 'regiuni de dezvoltare'
  if (tableName.includes('regiuni de dezvoltare')) return 'regiune';
  // check for 'macroregiuni'
  if (tableName.includes('macroregiuni')) return 'macroregiune';
  // else it is 'tara'
  return 'tara';
};


// ////////////////////////////////////////////////////////////////////////////////////////////
// // EXPORTS
module.exports = async (downloadDate) => {
  console.log('\x1b[34m%s\x1b[0m', `PROGRESS: Create Index Table\n`);
  // save path
  const folderPath = `./${downloadDate}/metadata`;
  // read file
  const tempoL3 = readFile(`${folderPath}/tempoL3.json`, 'utf8').level3;
  console.log('\x1b[36m%s\x1b[0m', `INFO: tempo level 3 array length = ${tempoL3.length}\n`);
  // process array
  // console.log(tempoL3[0]);
  const indexArr = [];
  // create header
  const arrHeader = [
    'prefix',
    'ancestor-level1',
    'ancestor-level2',
    'ancestor-level3',
    'table-name',
    'first-year',
    'last-year',
    'periodicity',
    'last-update',
    'data-granularity',
    'table-title',
  ];
  console.log('\x1b[34m%s\x1b[0m', `PROGRESS: Write header to new Array`);
  indexArr.push(arrHeader.join(';'));
  // for each item in tempo level 3 array
  tempoL3.forEach((item) => {
    // create new line from current line components
    const newLine = [];
    // // table prefix
    newLine.push(getTablePrefix(folderPath, item));
    // // table ancestor level 1
    newLine.push(item.ancestors[1].name.split(' ')[1]);
    // // table ancestor level 2
    newLine.push(item.ancestors[2].name);
    // // table ancestor level 3
    newLine.push(item.ancestors[3].name);
    // // table name
    newLine.push(item.tableName);
    // // first and last year
    newLine.push(...getYears(item));
    // // periodicity
    newLine.push(item.periodicitati.join(','));
    // // last update
    newLine.push(refactorDate(item.ultimaActualizare));
    // // granularity
    newLine.push(getGranularity(item.matrixName.trim()));
    // // table title
    newLine.push(`\"${item.matrixName.trim()}\"`);
    // add new line to new table
    indexArr.push(newLine.join(';'));
  });

  // write to file
	fs.writeFileSync(`${folderPath}/indexList.csv`, indexArr.join('\n'), 'utf8', () => console.log('\x1b[36m%s\x1b[0m', `INFO: Write 'indexList.csv' DONE!`));
};
