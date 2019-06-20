// download tables from INSSE-Tempo DataBase

// import libraries
const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

const RateLimiter = require('limiter').RateLimiter;
// Allow 150 requests per hour (the Twitter search limit). Also understands
// 'second', 'minute', 'day', or a number of milliseconds
const limiter = new RateLimiter(1, 'second');

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
// create log files for all tables
function initLogFiles(tables, logPath) {
  console.log('\x1b[34m%s\x1b[0m', `\nPROGRESS: Create Logs Files`);
  const headerArr = ['permutation', 'status', 'message'];
  tables.forEach((table) => {
    // write to file
    fs.writeFileSync(`${logPath}/${table.tableName}.csv`, `${headerArr.join(',')}\n`, 'utf8', () => {
      return true;
    });
  });
  console.log('\x1b[36m%s\x1b[0m', `INFO: log files created!`);
};

// /////////////////////////////////////////////////////////////////////
// create download files for all tables
function initDownloadFiles(headersArray, outPath) {
  console.log('\x1b[34m%s\x1b[0m', `\nPROGRESS: Create Download Files`);
  headersArray.forEach((item) => {
    const tableName = item.tableName;
    const tableHeader = `${item.keysArray.join(';')};${item.timesArray.join(';')};UM\n`;
    // write to file
    fs.writeFileSync(`${outPath}/${tableName}.csv`, tableHeader, 'utf8', () => {
      console.log('\x1b[36m%s\x1b[0m', `${item.tablePrefix}.${tableName} : download file created!`);
    });
  });
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
// for given table with permutations, request data from server
async function postRequest(downloadDate, table, permutationIndex, permutationsTotal, postBody) {
  const resData = await axios.post(reqPath, postBody);
  console.log('\x1b[33m%s\x1b[0m', `${table.tablePrefix}.${table.tableName} :: ${permutationIndex}/${permutationsTotal} >>> RESPONSE arrived`);
  // test response data contains data
  if (resData.data != null) {
    const testData = testForData(table.tablePrefix, table.tableName, permutationIndex, permutationsTotal, resData.data);
    // if response has data, extract data from html
    if (testData) {
      // set retry flag to false
      retryFlag = false;
      // /////////////////////////////////
      // return data extracted from html
      return extractData(table.tablePrefix, table.tableName, permutationIndex, permutationsTotal, resData.data);
      // return resData.data;
    // response has no data branch
    } else {
      console.log('\x1b[31m%s\x1b[0m', `${table.tablePrefix}.${table.tableName} :: ${permutationIndex}/${permutationsTotal} >>> ERROR: postData returns NO DATA`);
      // save error to log
      const errMessageArr = [permutationIndex, 'ERROR', 'postData returns no data'];
      appendLog(downloadDate, table.tableName, `${errMessageArr.join(',')}\n`);
    };
  // response is undefined
  } else {
    console.log('\x1b[31m%s\x1b[0m', `${table.tablePrefix}.${table.tableName} :: ${permutationIndex}/${permutationsTotal} >>> ERROR: postData returns "undefined"`);
    // save error to log
    const errMessageArr = [permutationIndex, 'ERROR', 'postData returns \"undefined\"'];
    appendLog(downloadDate, table.tableName, `${errMessageArr.join(',')}\n`);
  };
};

// /////////////////////////////////////////////////////////////////////
// test if response string returns data
function testForData(tablePrefix, tableName, permutationIndex, permutationsTotal, responseData) {
  console.log('\x1b[33m%s\x1b[0m', `${tablePrefix}.${tableName} :: ${permutationIndex}/${permutationsTotal} @testForData >>> START`);
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
    console.log('\x1b[31m%s\x1b[0m', `${tablePrefix} ${tableName} :: ${permutationIndex}/${permutationsTotal} @testForData >>>>>>> NOT OK !!! - retry\n`);
  } else {
    console.log('\x1b[32m%s\x1b[0m', `${tablePrefix} ${tableName} :: ${permutationIndex}/${permutationsTotal} @testForData >>>>>>> OK !!!\n`);
  }
  // return result
  return test;
};

// /////////////////////////////////////////////////////////////////////
// calculate the permutations that are not in the logs
function getArraysDiff(source, target) {
  // return array of items that are in source array but not in target array
  return source.filter(item => !target.includes(item[0]));
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
};

// /////////////////////////////////////////////////////////////////////
// clean data array
function cleanData(resArray) {
  // resArray is an array of arrays [['item;item;item', 'line2', 'line3', ..],[],..[]]
  let prevLineArr = [];
  // flatted the array to break the array items into items
  // for each permutation array in permutations array
  return resArray.flat().filter(line => line).map((line) => {
    // console.log(line);
    let newLine = line.replace(/\s+/g, ' ').replace(/\s?-\s?/g, '-');
    // break line in array
    const newArr = newLine.split(';');
    // if it is the first line, copy current line to prevLineArr
    if (prevLineArr.length === 0) {
      prevLineArr.push(...newArr);
      return line;
    // else, replace the '-' cells with the correspondig ones from prevLineArr
    } else {
      // return new line
      return newArr.map((cell, index) => {
        // if current cell is '-'
        if(cell === '-') {
          // return the corresponding value from prevLineArr
          return prevLineArr[index];
        // else
        } else {
          // update correspondig prevLineArr cell
          prevLineArr[index] = cell;
          // return the current cell
          return cell;
        };
      // return line as ';' separated string
      }).join(';');
    };
  })
};

// /////////////////////////////////////////////////////////////////////
// extract data from html
async function extractData(tablePrefix, tableName, permutationIndex, permutationsTotal, resData, tType) {
  const returnArray = [];
  // remove unnecessary '\n' characters
  const htmlTable = resData.resultTable.replace(/\\n/g, '');
  // console.log(htmlTable);

  // process html table
  const $ = cheerio.load(htmlTable);
  // select all 'tr' elements
  const trArray = $('tr');
  console.log('\x1b[33m%s\x1b[0m', `${tablePrefix}.${tableName} :: ${permutationIndex}/${permutationsTotal} >>> trArray.length = ${trArray.length}\n`);
  // there are two types of return tables
  // check which kind by verifying the presence of UM column in keys header array / trArray[1]
  const keysArray = [];
  $(trArray).eq(1).children().each((i, item) => {
    keysArray.push($(item).text());
  });
  console.log(`keysArray: ${keysArray.join(';')}`);
  const kArrLength = keysArray.length;
  console.log(`keysArray.length: ${kArrLength}`);
  const timesArray = [];
  $(trArray).eq(2).children().each((i, item) => {
    timesArray.push($(item).text());
  });
  console.log(`timesArray: ${timesArray.join(';')}`);
  const umHeaderItem = keysArray[kArrLength -2].toLowerCase();
  console.log(`UM header: ${umHeaderItem}`);
  const tableType = umHeaderItem.includes('um:') || umHeaderItem.includes('unitati de masura') ? 'B' : 'A';
  console.log(`Table type: ${tableType}`);

  // if this is the first permutation
  // create and add headers
  if (permutationIndex === 0) {
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
    };
    if (tableType === 'A') {
      // add 'UM' item to header
      tableHeader.splice(kArrLength, 0, 'UM');
      // add header to return array
      returnArray.push(`${tableHeader.join(';')}`);
    } else if (tableType === 'B') {
      // add header to return array
      returnArray.push(`${tableHeader.join(';')}`);
    };
  };
  
  // if table is of type A
  if (tableType === 'A') {
    // get UM value
    const umValue = $(trArray).eq(4).children().eq(0).text();
    console.log(`umValue: ${umValue}`);
    // filter out the first 5 rows
    // 0: tableTitle, 1: keys array (w/o UM), 2: timesArray, 3: UM header, 4: UM array
    // last row is footer
    $(trArray).slice(5, trArray.length - 1)
      .each((i, row) => {
        // console.log($(row).text());
        // console.log('bucla 1');
        const rowArray = [];
        $(row).children().each((j, cell) => {
          // console.log('bucla 2');
          // console.log($(cell).text());
          rowArray.push($(cell).text().trim());
        });
        // insert UM value into row array
        rowArray.splice(kArrLength, 0, umValue);
        // add current row to return array
        returnArray.push(`${rowArray.join(';')}`);
    });

  // else, if table is of type B
  } else if (tableType === 'B') {
    // filter out the first 5 rows
    // 0: tableTitle, 1: keys array (w/o UM), 2: timesArray, 3: UM header, 4: UM array
    // last row is footer
    $(trArray).slice(3, trArray.length - 1)
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
        returnArray.push(`${rowArray.join(';')}`);
    });

  } else {
    // throw error
    console.log(`ERROR: table ${tablePrefix}.${tableName} does not fit into type A or B\n`);
    throw new Error(`table ${tablePrefix}.${tableName} does not fit into type A or B\n`);
  }

  // console.log(returnArray);
  // retrun array for current permutation
  return returnArray;
};

// /////////////////////////////////////////////////////////////////////
// download table for query array
async function getTableData(downloadDate, table, permutation, permutationsTotal) {
  console.log('\x1b[34m%s\x1b[0m', `\nPROGRESS: Get Table Data`);
  console.log('\x1b[33m%s\x1b[0m', `${table.tablePrefix}.${table.tableName} :: permutation ${permutation[0]}/${permutationsTotal}`);

  const reqPath = `${requestPath}/${table.tableName}`;
  // create POST body
  const postBody = createPostBody(table, JSON.parse(permutation[1]));
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
          const messageArr = [permutationIndex, 'OK', 'Return DATA'];
          appendLog(downloadDate, tableName, `${messageArr.join(',')}\n`);
          // return data
          return extractData(table.tablePrefix, table.tableName, permutation[0], permutationsTotal, resData.data);
          // return resData.data;
        // response has no data branch
        } else {
          console.log('\x1b[31m%s\x1b[0m', `${table.tablePrefix}.${table.tableName} :: ${permutation[0]}/${permutationsTotal} >>> ERROR: postData returns NO DATA`);
          // save error to log
          const errMessageArr = [permutation[0], 'ERROR', 'postData returns no data'];
          appendLog(downloadDate, table.tableName, `${errMessageArr.join(',')}\n`);
        };
      // response is undefined
      } else {
        console.log('\x1b[31m%s\x1b[0m', `${table.tablePrefix}.${table.tableName} :: ${permutation[0]}/${permutationsTotal} >>> ERROR: postData returns "undefined"`);
        // save error to log
        const errMessageArr = [permutation[0], 'ERROR', 'postData returns \"undefined\"'];
        appendLog(downloadDate, table.tableName, `${errMessageArr.join(',')}\n`);
      };
    } catch(err) {
      console.log('\x1b[31m%s\x1b[0m', `${table.tablePrefix} ${table.tableName} :: ${permutation[0]}/${permutationsTotal}  @postRequest >>> INSSE server ERROR!`);
      // save error to log
      // const messageArr = [permutationIndex, 'ERROR', 'Axios request ERROR'];
      // appendLog(downloadDate, tableName, `${messageArr.join(',')}\n`);
      return err.data;
    };

  };

  // return array of lines /strings
  return resData;
};

// /////////////////////////////////////////////////////////////////////
// download one table
async function downloadTable(downloadDate, table, manualPermIndex) {
  console.log('\x1b[34m%s\x1b[0m', `\nPROGRESS: Download Table >>> ${table.tablePrefix}.${table.tableName}`);
  
  // get permutations from saved file
  const permutationsArrayAll = readCSV(`./${downloadDate}/permutations/${table.tableName}.csv`, '#');
  const permutationsTotal = permutationsArrayAll.length;
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

  // create batches from permutations array
  const batchArray = chunkArray(permutationsArrayAll, 10);
  // for each batch get data
  const tableData = []
  for (let i = 0; i < batchArray.length; i += 1) {
    console.log('\x1b[33m%s\x1b[0m', `\n${table.tablePrefix}.${table.tableName} :: batch ${i + 1}/${batchArray.length} >>>>>>>>>>>>>>>>>>>>>>>>>>>`);
    tableData.push( await Promise.all( batchArray[i].map( async (permutation) => {
      return getTableData(downloadDate, table, permutation, permutationsTotal);
    })).catch( e => {
      console.log("ERROR: some Promise is broken in @getTableData", e)
    })
    );
  };


  // replace '-' cells with parent data
  // tableData is an array of arrays [['item;item;item', 'line2', 'line3', ..],[],..[]]
  console.log('\x1b[33m%s\x1b[0m', `\n${table.tablePrefix}.${table.tableName} :: clean DATA >>>`);
  const cleanedData = cleanData(tableData.flat());
  
  // save data to file
  console.log('\x1b[33m%s\x1b[0m', `\n${table.tablePrefix}.${table.tableName} :: >>> save DATA`);
  writeData(`./${downloadDate}/tables/${table.tableName}.csv`, `${cleanedData.join('\n')}\n`);

  // save log
  console.log('\x1b[33m%s\x1b[0m', `\n${table.tablePrefix}.${table.tableName} :: >>> save LOG`);
  appendCompletedLog(downloadDate, `${toble.tableName}\n`);
};

// /////////////////////////////////////////////////////////////////////
// download array of tables
async function downloadTables(downloadDate, tempoL3, tablesList) {
  console.log('\x1b[34m%s\x1b[0m', `\nPROGRESS: Download Tables Array >>> START`);
  // get tables list from custom provided tables
  const tablesKeys = Object.keys(tablesList);

  // get finished tables from tables log
  // read files
  const completedLogPath = `./${downloadDate}/logs/tablesProgress.csv`;
  const completedTables = [];
  // if completed log file exists
  if (fs.existsSync(completedLogPath)) {
    // return parsed file
    completedTables.push(...fs.readFileSync(completedLogPath, 'utf8').split('\n'));
  };

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

      for (table of tablesArray) {
        await downloadTable(downloadDate, table, tablesList[table.tableName]);
      }
    }

  // if the list is empty download all tables
  } else {
     // completed tables are removed from list
     const tablesArray = tempoL3.filter(item => {
      return !completedTables.includes(item.tableName);
    });
    for (table of tablesArray) {
      await downloadTable(downloadDate, table, []);
    }
  }

 };


// ////////////////////////////////////////////////////////////////////////////////////////////
// // EXPORTS
module.exports =  (downloadDate, tablesArray, newFlag) => {
  console.log('\x1b[34m%s\x1b[0m', `\nSTART: Download Tables >>> ${newFlag ? 'NEW DOWNLOAD' : 'CONTINUE MOST RECENT'}`);
  // paths
  // const outPath = `./${downloadDate}/tables`;
  const logPath = `./${downloadDate}/logs`;
  // read files
  const tempoL3 = readJSON(`${downloadDate}/metadata/tempoL3.json`, 'utf8').level3;
  console.log('\x1b[36m%s\x1b[0m', `INFO: tempo level 3 array length = ${tempoL3.length}\n`);
  
  // // get headers array from header file
  // const headersArray = readJSON(`./${downloadDate}/metadata/headers.json`, ';');
  // create log files and download files, if new download (newFlag === true)
  if (newFlag) {
    initLogFiles(tempoL3, logPath);
    // initDownloadFiles(headersArray, outPath);
  };

  // download tables from tablesArray
  downloadTables(downloadDate, tempoL3, tablesArray);
};
