// download tables from INSSE-Tempo DataBase

// import libraries
const fs = require('fs-extra');
const axios = require('axios');
const cheerio = require('cheerio');

// global variables
const csvDelimiter = '#';

// paths
const requestPath = 'http://statistici.insse.ro:8077/tempo-ins/matrix';


// ////////////////////////////////////////////////////////////////////////////////////////////
// // METHODS

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

// /////////////////////////////////////////////////////////////////////
// create POST body
function createPostBody(header, permutation) {
  const postBody = {};
  postBody.language = 'ro';
  postBody.arr = permutation;
  postBody.matrixName = header.matrixName;
  postBody.matrixDetails = header.details;
  // return POST body
  return postBody;
};

// /////////////////////////////////////////////////////////////////////
// test if response string returns data
function testForData(tablePrefix, tableName, permutationIndex, permutationsTotal, responseData) {
  console.log('\x1b[34m%s\x1b[0m', `\nPROGRESS: TEST for Data`);
  console.log('\x1b[33m%s\x1b[0m', `${tablePrefix}.${tableName} :: permutation ${permutationIndex}/${permutationsTotal}`);
  // const testString1 = 'Rezultatul solicitat nu poate fi returnat.';
  // const testString2 = 'Cautarea dvs nu a returnat nici un rezultat.';
  const testString3 = 'Legenda:';
  let test = false;
  if (responseData.resultTable != null) {
    // parse html string and remove '\n' substring
    const htmlTable = responseData.resultTable.replace(/\\n/g, '');
    const $ = cheerio.load(htmlTable);

    // get all text
    const textContent = $('.tempoResults').text();
    // test if text contains any of the substrings
    // test = textContent.includes(testString1) || textContent.includes(testString2);
    test = textContent.includes(testString3);
  }
  // display outcome
  if (!test) {
    console.log('\x1b[31m%s\x1b[0m', `${tablePrefix} ${tableName} :: ${permutationIndex}/${permutationsTotal} @testForData >>>>>>> NOT OK !!! - retry`);
  } else {
    console.log('\x1b[32m%s\x1b[0m', `${tablePrefix} ${tableName} :: ${permutationIndex}/${permutationsTotal} @testForData >>>>>>> OK !!!`);
  }
  // return result
  return test;
};

// /////////////////////////////////////////////////////////////////////
// append log file
function appendLog(downloadDate, tableName, message) {
  const logFile = `./${downloadDate}/logs/${tableName}.csv`;
  fs.appendFile(logFile, message, (err) => {
    if (err) throw err;
    // console.log('Log entry done!');
  });
};

// /////////////////////////////////////////////////////////////////////
// append tables log file
function appendCompletedLog(downloadDate, message) {
  const logFile = `./${downloadDate}/logs/tablesProgress.csv`;
  fs.appendFile(logFile, message, (err) => {
    if (err) throw err;
    // console.log('Log entry done!');
  });
};

// /////////////////////////////////////////////////////////////////////
// append data file
function writeData(filePath, message) {
  // write to file
	fs.writeFileSync(filePath, message, 'utf8');
};

// /////////////////////////////////////////////////////////////////////
// break array into chunks
function chunkArray(myArray, chunk_size){
  const arrayLength = myArray.length;
  const tempArray = [];
  
  for (let index = 0; index < arrayLength; index += chunk_size) {
      myChunk = myArray.slice(index, index+chunk_size);
      // Do something if you want with the group
      tempArray.push(myChunk);
  }

  return tempArray;
}

// /////////////////////////////////////////////////////////////////////
// clean data array
function cleanData(resArray) {
  console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> clean data >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
  // resArray is an array of arrays [['item;item;item', 'line2', 'line3', ..],[],..[]]
  let prevLineArr = [];
  // flattened the array to break the array items into items
  // for each permutation array in permutations array
  return resArray.flat().filter(line => line).map((line) => {
    // console.log(line);
    let newLine = line.replace(/\s+/g, ' ').replace(/\s?-\s?/g, '-');
    // break line in array
    const newArr = newLine.split(csvDelimiter);
    // if it is the first line, copy current line to prevLineArr
    if (prevLineArr.length === 0) {
      prevLineArr.push(...newArr);
      return line;
    // else, replace the '-' cells with the corresponding ones from prevLineArr
    } else {
      // return new line
      return newArr.map((cell, index) => {
        // if current cell is '-'
        if(cell === '-') {
          // return the corresponding value from prevLineArr
          return prevLineArr[index];
        // else
        } else {
          // update corresponding prevLineArr cell
          prevLineArr[index] = cell;
          // return the current cell
          return cell;
        }
      // return line as csvDelimiter separated string
      }).join(csvDelimiter);
    }
  });
}

// /////////////////////////////////////////////////////////////////////
// clean data array
function moveColumns(inArray) {
  console.log('\x1b[34m%s\x1b[0m', `\nPROGRESS: Move miss-aligned columns to correct positions`);
  // console.log(inArray);
  // fs.writeFileSync('./2021-02-09/test/AGR101B.csv', inArray.join('\n'));

  // prepare return array
  const outArray = [];

  // extract header row
  const headerRow = inArray[0].split('#');

  // traverse in array
  let missalignedFlag = false;
  let maColumnIndexes = [];

  for(let i = 0; i < inArray.length; i += 1) {
    // console.log(`\n#${i} :`);
    // console.log(inArray[i]);
    // if header row, check for size
    if (inArray[i][0] === '#') {
      // reset miss-aligned column indexes array
      maColumnIndexes = [];
      const hRow = inArray[i].split('#');
      // if current header row is equal in length to array header
      if (hRow.length === headerRow.length) {
        // console.log('\t# > length === true');
        // set miss-aligned flag to false
        missalignedFlag = false;

        // else, this is a miss-aligned header row
      } else {
        // console.log('\t# > length === false');
        // set miss-aligned flag to true
        missalignedFlag = true;
        // calculate columns indexes
        inArray[i].split('#').forEach((item) => {
          maColumnIndexes.push(headerRow.indexOf(item));
        });
      }
      // skip to next item in array
      continue;
    }

    // if miss-aligned row
    if (missalignedFlag) {
      // console.log('\t# > missalignedFlag === true');
      // prepare current row
      const currentRow = inArray[i].split('#');
      // create new row
      const newRow = Array(headerRow.length).fill('');
      // for each index in column index array
      console.log(maColumnIndexes);
      maColumnIndexes.forEach((ix, index) => {
        if (ix >= 0) {
          newRow[ix] = currentRow[index];
        } else {
          newRow[index] = currentRow[index];
        }
      });
      // push new row into return array
      outArray.push(newRow.join('#'));

      // else, there is no need for changes
    } else {
      // console.log('\t# > missalignedFlag === false');
      // push original row into return array
      outArray.push(inArray[i]);
    }
  }

  // return new array
  return outArray;
}

// /////////////////////////////////////////////////////////////////////
// extract data from html for the first item, including tableType and tableHeader
function extractData1(tablePrefix, tableName, permutationIndex, permutationsTotal, resData) {
  console.log('\x1b[34m%s\x1b[0m', `\nPROGRESS: Extract Data for First Permutation from HTML`);
  const returnArray = [];
  // remove unnecessary '\n' characters
  const htmlTable = resData.resultTable.replace(/\\n/g, '');
  // console.log(htmlTable);

  // process html table
  const $ = cheerio.load(htmlTable);
  // select all 'tr' elements
  const trArray = $('tr');
  console.log('\x1b[33m%s\x1b[0m', `${tablePrefix}.${tableName} :: ${permutationIndex}/${permutationsTotal} >>> trArray.length = ${trArray.length}\n`);
  // there are multiple types of return tables
  // check which kind by verifying the presence of UM column in keys header array / trArray[1]
  const keysArray = [];
  $(trArray).eq(1).children().each((i, item) => {
    keysArray.push($(item).text());
  });
  console.log(`keysArray: ${keysArray.join(csvDelimiter)}`);
  const kArrLength = keysArray.length;
  console.log(`keysArray.length: ${kArrLength}`);
  const timesArray = [];
  $(trArray).eq(2).children().each((i, item) => {
    timesArray.push($(item).text());
  });
  console.log(`timesArray: ${timesArray.join(csvDelimiter)}`);
  const umHeaderItem = keysArray[kArrLength -2].toLowerCase();
  console.log(`UM header: ${umHeaderItem}`);
  const tableType = umHeaderItem.includes('um:') || umHeaderItem.includes('unitati de masura') ? 'B' : 'A';
  console.log(`Table type: ${tableType}`);
  let umValue = '';
  const tableInfo = {
    type: tableType,
    kArrLength,
    umValue
  };

  // create header
  const tableHeader = [];
  // if keys array has more than two columns
  if (kArrLength > 2) {
  // add keys array items to header
  tableHeader.push(...keysArray.slice(0, kArrLength - 1));
  // add times array items to header
  tableHeader.push(...timesArray);
  // else, if keys array has one or two columns
  } else {
    // manually add 'UM' column and the times array
    tableHeader.push('UM', ...timesArray);
  }
  if (tableType === 'A') {
    // add 'UM' item to header
    tableHeader.splice(kArrLength - 1, 0, 'UM');
    // get UM value
    umValue = $(trArray).eq(4).children().eq(0).text();
    // update return umValue
    tableInfo.umValue = umValue;
  }

  return {
    tableInfo,
    tableHeader,
  };
}

// /////////////////////////////////////////////////////////////////////
// extract data from html
function extractDataA(tablePrefix, tableName, permutation, permutationsTotal, resData, kArrLength, umValue) {
  console.log('\x1b[34m%s\x1b[0m', `\nPROGRESS: Extract Data from HTML, table type A`);
  console.log('\x1b[33m%s\x1b[0m', `${tablePrefix}.${tableName} :: permutation ${permutation[0]}/${permutationsTotal}`);
  const returnArray = [];
  // remove unnecessary '\n' characters
  const htmlTable = resData.resultTable.replace(/\\n/g, '');
  // console.log(htmlTable);

  // process html table
  const $ = cheerio.load(htmlTable);
  // select all 'tr' elements
  let trArray = $('tr');
  console.log('\x1b[33m%s\x1b[0m', `${tablePrefix}.${tableName} :: ${permutation[0]}/${permutationsTotal} >>> trArray.length = ${trArray.length - 6 }\n`);
  
  // filter out the first 5 rows
  // 0: tableTitle, 1: keys array (w/o UM), 2: timesArray, 3: UM header, 4: UM array
  // last row is footer
  $(trArray).splice(3, 2);
  // console.log(`trArray.length: ${$(trArray).length}`);
  // console.log(`trArray[2].length: ${$(trArray).eq(2).children().length}`);
  // console.log(`trArray[3].length: ${$(trArray).eq(3).children().length}`);
  const headerColumnsCount = $(trArray).eq(3).children().length - $(trArray).eq(2).children().length;
  console.log('headerColumnsCount: ', headerColumnsCount);
  $(trArray).slice(2, trArray.length - 1) // remove rows 0,1,3,4, timesArray is needed for further checks
    .each((i, row) => {
      // console.log($(row).text());
      const rowArray = i === 0 ? Array(headerColumnsCount) : [];
      $(row).children().each((j, cell) => {
        // console.log('bucla 2');
        // console.log($(cell).text());
        rowArray.push($(cell).text().trim());
      });
      // insert UM value into row array
      rowArray.splice(kArrLength - 1, 0, umValue);
      // add current row to return array
      returnArray.push(`${rowArray.join(csvDelimiter)}`);
  });

  // console.log(returnArray);
  // check return array if it has expected number of rows
  const arrayLength = returnArray.length;
  const expectedLength = permutation[1];
  console.log(`@extractDataA :: return array length = ${arrayLength} / expected = ${expectedLength + 1}`);
  // retrun array for current permutation
  return returnArray;
}

// /////////////////////////////////////////////////////////////////////
// extract data from html
function extractDataB(tablePrefix, tableName, permutation, permutationsTotal, resData) {
  console.log('\x1b[34m%s\x1b[0m', `\nPROGRESS: Extract Data from HTML, table type B`);
  console.log('\x1b[33m%s\x1b[0m', `${tablePrefix}.${tableName} :: permutation ${permutation[0]}/${permutationsTotal}`);
  const returnArray = [];
  // remove unnecessary '\n' characters
  const htmlTable = resData.resultTable.replace(/\\n/g, '');
  // console.log(htmlTable);

  // process html table
  const $ = cheerio.load(htmlTable);
  // select all 'tr' elements
  const trArray = $('tr');
  console.log('\x1b[33m%s\x1b[0m', `${tablePrefix}.${tableName} :: ${permutation[0]}/${permutationsTotal} >>> trArray.length = ${trArray.length - 4 }\n`);

  // filter out the first 3 rows
  // 0: tableTitle, 1: keys array (w UM), 2: timesArray
  // last row is footer
  $(trArray).slice(2, trArray.length - 1) // replaced 3 with 2, timesArray is needed for future checks
    .each((i, row) => {
      // console.log($(row).text());
      // console.log('bucla 1');
      const rowArray = [];
      $(row).children().each((j, cell) => {
        // console.log('bucla 2');
        // console.log($(cell).text());
        rowArray.push($(cell).text().trim());
      });
      // add current row to return array
      returnArray.push(`${rowArray.join(csvDelimiter)}`);
  });

  // console.log(returnArray);
  // check return array if it has expected number of rows
  const arrayLength = returnArray.length;
  const expectedLength = permutation[1];
  console.log(`@extractDataB :: return array length = ${arrayLength} / expected = ${expectedLength + 1}`);
  // retrun array for current permutation
  return returnArray;
}

// /////////////////////////////////////////////////////////////////////
// download table for query array
async function getTableData(downloadDate, table, permutation, permutationsTotal, tableInfo, firstFlag) {
  console.log('\x1b[34m%s\x1b[0m', `\nPROGRESS: Get Table Data`);
  // console.log(permutation);
  console.log('\x1b[33m%s\x1b[0m', `${table.tablePrefix}.${table.tableName} :: permutation ${permutation[0]}/${permutationsTotal}`);

  const reqPath = `${requestPath}/${table.tableName}`;
  // create POST body
  const postBody = createPostBody(table, JSON.parse(permutation[2]));
  // console.log(JSON.stringify(postBody));
  let resData = '';

  // ///////////////////////////////////////
  // repeat current request until data is received
  // retry flag
  let retryFlag = true;
  // while retry flag is true
  while (retryFlag) {
    // request data from server
    // postRequest(downloadDate, table.tablePrefix, table.tableName, permutation[0], permutationsTotal, postBody)
    console.log('\x1b[33m%s\x1b[0m', `${table.tablePrefix}.${table.tableName} :: ${permutation[0]}/${permutationsTotal} >>> SEND request`);
    try {
      // resData = await postRequest(downloadDate, table, permutation[0], permutationsTotal, postBody);
      resData = await axios.post(reqPath, postBody);
      console.log('\x1b[33m%s\x1b[0m', `${table.tablePrefix}.${table.tableName} :: ${permutation[0]}/${permutationsTotal} >>> RESPONSE arrived`);
      // test if response data contains data
      if (resData.data != null) {
        const testData = testForData(table.tablePrefix, table.tableName, permutation[0], permutationsTotal, resData.data);
        // if response has data, extract data from html
        if (testData) {
          // set retry flag to false
          retryFlag = false;
          // /////////////////////////////////
          // return data extracted from html
          // save progress to log
          const messageArr = [permutation[0], 'OK', 'Return DATA'];
          appendLog(downloadDate, table.tableName, `${messageArr.join(',')}\n`);
          // return data
          // if this is a first permutation
          if (firstFlag) {
            return extractData1(table.tablePrefix, table.tableName, permutation[0], permutationsTotal, resData.data);
          // if this in not the first permutation
          // if table type is A
          } else if (tableInfo.type === 'A') {
            return extractDataA(table.tablePrefix, table.tableName, permutation, permutationsTotal, resData.data, tableInfo.kArrLength, tableInfo.umValue);
          // if table type is B
          } else if (tableInfo.type === 'B') {
            return extractDataB(table.tablePrefix, table.tableName, permutation, permutationsTotal, resData.data);
          // in it does not fit in the cases above
          } else {
            // throw error
            throw new Error('NO table type');
          }
          
          // return resData.data;
        // response has no data branch
        } else {
          console.log('\x1b[31m%s\x1b[0m', `${table.tablePrefix}.${table.tableName} :: ${permutation[0]}/${permutationsTotal} >>> ERROR: postData returns NO DATA`);
          // save error to log
          const errMessageArr = [permutation[0], 'ERROR', 'postData returns no data'];
          appendLog(downloadDate, table.tableName, `${errMessageArr.join(',')}\n`);
        }
      // response is undefined
      } else {
        console.log('\x1b[31m%s\x1b[0m', `${table.tablePrefix}.${table.tableName} :: ${permutation[0]}/${permutationsTotal} >>> ERROR: postData returns "undefined"`);
        // save error to log
        const errMessageArr = [permutation[0], 'ERROR', 'postData returns \"undefined\"'];
        appendLog(downloadDate, table.tableName, `${errMessageArr.join(',')}\n`);
      }
    } catch(err) {
      console.log('\x1b[31m%s\x1b[0m', `${table.tablePrefix} ${table.tableName} :: ${permutation[0]}/${permutationsTotal}  @getTableData >>> try branch ERROR`);
      // save error to log
      const messageArr = [permutation[0], 'ERROR', `try branch ERROR: ${err.message}`];
      appendLog(downloadDate, table.tableName, `${messageArr.join(',')}\n`);
      console.log(err);
      if (err.code === 'ECONNREFUSED') throw new Error('ECONNREFUSED');
      return err.data;
    }

  }

  // return array of lines /strings
  return resData;
}

// /////////////////////////////////////////////////////////////////////
// download one table
async function downloadTable(downloadDate, table, manualPermIndex) {
  console.log('\x1b[34m%s\x1b[0m', `\nPROGRESS: Download Table >>> ${table.tablePrefix}.${table.tableName}`);
  
  // get permutations from saved file
  const permutationsArrayAll = readCSV(`./${downloadDate}/permutations/${table.tableName}.csv`, csvDelimiter);
  const permutationsTotal = permutationsArrayAll.length - 1;
  console.log('\x1b[33m%s\x1b[0m', `\n${table.tablePrefix}.${table.tableName} total permutations = ${permutationsTotal}`);
  // // create query permutation array
  // let permutationsArrayRest = [];
  // // if a manual permutations array is specified
  // if (manualPermIndex.length > 0) {
  //   // get the permutation from the permutationArrayAll for the requested indexes
  //   permutationsArrayRest = permutationArrayAll.filter(item => manualPermIndex.includes(item[0]));
  //   // if no permutations are found for the provided indexes
  //   if (!permutationsArrayRest.length > 0) {
  //     console.log(`ERROR: ${tablePrefix}.${tableName} the provided permutation indexes do not match to available permutations\n`);
  //     // throw error
  //     throw new Error(`${tablePrefix}.${tableName} :: ERROR: the provided permutation indexes do not match to available permutations\n`);
  //   };
  // // else, if no manual permutations array is specified
  // } else {
  //   // get permutations from logs
  //   const permutationsArrayLogs = readCSV(`./${downloadDate}/logs/${table.tableName}.csv`, ',');
  //   // calculate remaining permutations
  //   permutationsArrayRest = getArraysDiff(permutationArrayAll, permutationsArrayLogs);
  //   console.log('\x1b[33m%s\x1b[0m', `\n${table.tablePrefix}.${table.tableName} remaining permutations = ${permutationsArrayRest.length} / ${permutationsTotal}`);
  // };

  // create batches from permutations array, without the first permutation
  const batchArray = chunkArray(permutationsArrayAll, 5);
  const tableData = []
  // console.log(permutationsArrayAll[0]);
  // get data from first permutation
  console.log('\x1b[33m%s\x1b[0m', `\n${table.tablePrefix}.${table.tableName} :: first permutation >>>>>>>>>>>>>>>>>>>>>>>>>>>`);
  const { tableInfo, tableHeader } = await getTableData(downloadDate, table, permutationsArrayAll[0], permutationsTotal, '', true);
  // add new data to table Data
  tableData.push(tableHeader.join(csvDelimiter));

  // get the rest of the data
  // for each batch get data
  for (let i = 0; i < batchArray.length; i += 1) {
    console.log('\x1b[33m%s\x1b[0m', `\n${table.tablePrefix}.${table.tableName} :: batch ${i + 1}/${batchArray.length} >>>>>>>>>>>>>>>>>>>>>>>>>>>`);
    tableData.push( await Promise.all( batchArray[i].map( async (permutation) => {
      return getTableData(downloadDate, table, permutation, permutationsTotal, tableInfo, false);
    })).catch( e => {
      console.log("ERROR: some Promise is broken in @getTableData", e);
    }));
  }

  // replace '-' cells with parent data
  // tableData is an array of arrays [['item;item;item', 'line2', 'line3', ..],[],..[]]
  console.log('\x1b[33m%s\x1b[0m', `\n${table.tablePrefix}.${table.tableName} :: clean DATA >>>`);
  const cleanedData = cleanData(tableData.flat());

  // move miss-aligned columns, caused by less columns returned than expected
  console.log('\x1b[33m%s\x1b[0m', `\n${table.tablePrefix}.${table.tableName} :: move miss-aligned columns >>>`);
  const writeArray = moveColumns(cleanedData);
  
  // save data to file
  console.log('\x1b[33m%s\x1b[0m', `\n${table.tablePrefix}.${table.tableName} :: >>> save DATA`);
  writeData(`./${downloadDate}/tables/${table.tableName}.csv`, `${writeArray.join('\n')}\n`);

  // save log
  console.log('\x1b[33m%s\x1b[0m', `\n${table.tablePrefix}.${table.tableName} :: >>> save LOG`);
  appendCompletedLog(downloadDate, `${table.tableName}\n`);
}

// /////////////////////////////////////////////////////////////////////
// download array of tables
async function downloadTables(downloadDate, tempoL3, tablesList) {
  console.log('\x1b[34m%s\x1b[0m', `\nPROGRESS: Download Tables Array >>> START`);
  // get tables list from custom provided tables
  const tablesKeys = Object.keys(tablesList);

  // get finished tables from tables log
  // read files
  const completedLogPath = `./${downloadDate}/logs/tablesProgress.csv`;
  // create an empty table, add tableNames to skip downloading!!
  const completedTables = ['PNS101B']; // add tables names to skip
  // if completed log file exists
  if (fs.existsSync(completedLogPath)) {
    // return parsed file
    completedTables.push(...fs.readFileSync(completedLogPath, 'utf8').split('\n'));
  }

  // if a list of table is requested
  if (tablesKeys.length > 0) {
    // tempaL3 array is filtered for only those items
    const tablesArray = tempoL3.filter(item => {
      return tablesKeys.includes(item.tableName) && !completedTables.includes(item.tableName);
    });
    // if matches are found
    if (tablesArray.length > 0) {
      console.log(`tablesArray.length = ${tablesArray.length}`);
      // // for each file in array
      // tablesArray.forEach(async (table) => {
      //   // download table data and save it in csv file
      //   await downloadTable(downloadDate, table, tablesList[table.tableName]);
      // });

      for (let i = 0; i < tablesArray.length; i += 1) {
        await downloadTable(downloadDate, tablesArray[i], tablesList[tablesArray[i].tableName]);
      }
    }

  // if the list is empty download all tables
  } else {
     // completed tables are removed from list
    const tablesArray = tempoL3.filter(item => {
      return !completedTables.includes(item.tableName);
    });
    console.log(`tablesArray.length = ${tablesArray.length}`);
    for (let i = 0; i < tablesArray.length; i += 1) {
      await downloadTable(downloadDate, tablesArray[i], []);
    }
  }

}


// ////////////////////////////////////////////////////////////////////////////////////////////
// // EXPORTS
module.exports =  (downloadDate, tablesArray, newFlag) => {
  console.log('\x1b[34m%s\x1b[0m', `\nSTART: Download Tables >>> ${newFlag ? 'NEW DOWNLOAD' : 'CONTINUE MOST RECENT'}`);

  // read files
  const tempoL3 = readJSON(`${downloadDate}/metadata/tempoL3.json`, 'utf8').level3;
  console.log('\x1b[36m%s\x1b[0m', `INFO: tempo level 3 array length = ${tempoL3.length}\n`);

  // test
  // console.log(tempoL3.filter(table => table.tableName === 'POP206E')[0].dimensionsMap);

  // download tables from tablesArray
  downloadTables(downloadDate, tempoL3, tablesArray);

  // test function
  // const inArray = readCSV('./2021-02-09/test/AGR101B.csv', '\n');
  // // console.log(inArray.flat());
  // const outArray = moveColumns(inArray.flat());
  // fs.writeFileSync('./2021-02-09/extracts/AGR101B.csv', outArray.join('\n'));
};
