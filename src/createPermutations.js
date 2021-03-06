// create permutations for each table

// import libraries
const fs = require('fs');

// local values
const queryLimit = 30000; // default 30000, for PNS101B = 100
const columnLimit = 500;  // default 500,  for PNS101B = 20


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
// create array of groups for column given
function groupColumnItems(index, column, parenthood, limit) {
  // create a work array
  let workColumn = column.slice();
  let newLimit = 0;
  // console.log('@group::workColumn: ', workColumn);
  console.log('\x1b[34m%s\x1b[0m', '\n@groupColumnItems >>>>>>>');
  console.log('@group::limit: ', limit);
  console.log('@group::parenthood = ', parenthood);
  console.log('@group::column length = ', workColumn.length);
  // initialize the return array
  const returnArr = {
    type: 'regular',
    values: [],
    dependent: false,
  };

  // /////////////////////////////////////////////////////
  // check if current column has dependency
  returnArr.dependent = workColumn[0].parentId !== null;
  console.log('@group::dependent = ', returnArr.dependent);
  // check if current column is parent
  // console.log('parenthood = ', parenthood);

  // /////////////////////////////////////////////////////
  // if column has children items and items are not also parents
  if (returnArr.dependent && !parenthood) {
    console.log('\x1b[36m%s\x1b[0m', '@group:: children branch');
    // save 'Total' column separately
    // let totalColumn = null;
    // if (workColumn[0].parentId === workColumn[0].nomItemId) totalColumn = workColumn.shift();
    // there ara parents with no depending children, just total column (ex: G.1.1 GOS109A)
    // set a group for total
    // returnArr.values.push([totalColumn]);

    // create array of Children by grouping items with same parrent
    while (workColumn.length > 0) {
      const searchId = workColumn[0].parentId;
      returnArr.type = 'children';
      returnArr.values.push(workColumn.filter(item => item.parentId === searchId));
      returnArr.dependent = true;
      workColumn = workColumn.filter(item => item.parentId !== searchId);
    }

    // calculate new limit dividing the current limit to the largest group of items in array
    const lenghtsArr = returnArr.values.map(item => item.length);
    newLimit = Math.floor(limit / Math.max(...lenghtsArr));

    // if column has parent items
  } else if (parenthood) {
    console.log('\x1b[36m%s\x1b[0m', '@group:: parent branch');
    returnArr.type = 'parents';
    // remove 'total' cell
    // if (workColumn[0].label.toLowerCase().trim() === 'total') workColumn.shift();
    // return items
    returnArr.values = workColumn.map(item => [item]);
    // one item array does not influence the limit, return same limit
    newLimit = limit;

    // if column has regular items
    // // if query limit has been reached, group elements in one items arrays
  } else if (limit === 0) {
    console.log('\x1b[36m%s\x1b[0m', '@group:: limit === 0 branch');
    returnArr.values = workColumn.map(item => [item]);
    // console.log(returnArr.values);

    // // if query limit is not reached, make one array with all items
  } else if (limit >= column.length) {
    console.log('\x1b[36m%s\x1b[0m', '@group:: limit > column.length branch');
    // a column selection can hold max 500 items
    if (column.length > columnLimit) {
      for (let i = 0, j = workColumn.length; i < j; i += columnLimit) {
        returnArr.values.push(workColumn.splice(0, columnLimit));
      }
      newLimit = Math.floor(limit / columnLimit);
    } else {
      returnArr.values = [workColumn];
      newLimit = Math.floor(limit / column.length);
    }

    // // if query limit is not reached, but is smaller than the amount of items
  } else if (limit < column.length) {
    console.log('\x1b[36m%s\x1b[0m', '@group:: limit < column.length branch');
    // a column selection can hold max 500 items
    if (limit > 500) {
      for (let i = 0, j = workColumn.length; i < j; i += 500) {
        returnArr.values.push(workColumn.splice(0, 500));
      }
      newLimit = 0;
    } else {
      for (let i = 0, j = workColumn.length; i < j; i += limit) {
        returnArr.values.push(workColumn.splice(0, limit));
      }
      newLimit = 0;
    }
  }

  console.log('@group:: return values !!! ');
  // console.log(returnArr.values);

  // return the array with grouped values
  return { returnArr, newLimit };
};

// /////////////////////////////////////////////////////////////////////
// count expected number of rows
function countItems(perm) {
  // if the table has only two columns, return 1
  // if (perm.length === 2) return 1;
  let itemCount = 1;
  for (let i = 0; i < perm.length - 2; i += 1) {
    itemCount *= perm[i].length;
  }

  // return count value
  return itemCount;
};

// /////////////////////////////////////////////////////////////////////
// build permutations
function buildPermutations(outPath, table, limit) {
  const tableName = table.tableName;
  const columns = table.dimensionsMap;
  console.log('\x1b[34m%s\x1b[0m', `\n${tableName}:: @buildPermutations for ${columns.length} columns`);

  let workLimit = limit;
  let permutations = [];
  const typeArray = [];
  let parenthood = false;
  // let tableType = 'regular';

  // iterate over array of columns and build the permutations
  columns.reverse().forEach((column, index) => {
    // for each column return items grouped
    const groupedColumn = groupColumnItems(index, column.options, parenthood, workLimit);
    console.log(`@build:: column: ${index}   >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>`);
    // console.log(groupedColumn.returnArr.values);

    // create work array
    const newPermutations = [];
    // update type Array
    typeArray.push(groupedColumn.returnArr.type);
    // update Limit
    workLimit = groupedColumn.newLimit;
    // update parenthood for next column
    // // if current items are children set parenthood to true
    if (groupedColumn.returnArr.type === 'children') {
      parenthood = true;
      // // if current items are parents of parents
    } else if (groupedColumn.returnArr.type === 'parents' && groupedColumn.returnArr.dependent) {
      parenthood = true;
      // // if current items have no dependency
    } else {
      parenthood = false;
    }

    // create permutation array
    // if culumn type is 'parents'
    if (groupedColumn.returnArr.type === 'parents') {
      console.log('\n@build:: parents branch');

      // console.log(lastPermutation);
      // get total column permutation
      // console.log(permutations);
      const totalPermutation = permutations.filter((child) => {
        return child[0][0].label.trim().toLowerCase() === 'total';
      });
      // console.log(totalPermutation);

      // // if last column were parents
      if (typeArray[typeArray.length - 2] === 'parents') {
        console.log('\n@build:: parents branch <<<<< parents');
        // for each parent
        groupedColumn.returnArr.values.forEach((parent) => {
          // find all children
          const children = permutations.filter((child) => {
            // console.log(child);
            return child[0][0].parentId === parent[0].nomItemId;
          });
          // console.log('\n@build:: parents branch <<<<< parents.length = ', children.length);

          // if parent has children, pair parent with each child
          if (children.length > 0) {
            children.forEach((child) => { newPermutations.push([parent, ...child]); });
          }
          // console.log(newPermutations[1]);

          // also pair parent with total permutation
          if (totalPermutation.length > 0) {
            newPermutations.push([parent, ...totalPermutation[0]]);
          }
        });

        // // if last column were children
      } else if (typeArray[typeArray.length - 2] === 'children') {
        console.log('\n@build:: parents branch <<<<< children');
        // console.log(permutations);
        // for each parent
        groupedColumn.returnArr.values.forEach((parent) => {
          // find all children
          const children = permutations.filter((child) => {
            // console.log('\n@build:: parents branch <<<<< children child = ', child);
            return child[0][0].parentId === parent[0].nomItemId;
          });
          // console.log('\n@build:: parents branch <<<<< children.length = ', children.length);
          // console.log(children);

          // if parent has children, pair parent with children
          if (children.length > 0) {
            children.forEach((child) => { newPermutations.push([parent, ...child]); });
            // console.log(newPermutations[newPermutations.length - 1]);
          }

          // also pair parent with total permutation (except the total column, if already added)
          // // if this parent is 'total' and has children
          // console.log('parent: ', parent);
          if (parent[0].label.trim().toLowerCase() === 'total' && children.length > 0) {
            // do nothing, total parents can have only total children
            // // else, if total permutation is not null
          } else if (totalPermutation.length > 0) {
            // add parent and total permutation pair
            // console.log(totalPermutation);
            newPermutations.push([parent, ...totalPermutation[0]]);
            // console.log(newPermutations[newPermutations.length - 1]);
          }
        });
      }

      // column contains children
    } else if (groupedColumn.returnArr.type === 'children') {
      // if first column
      if (permutations.length > 0) {
        console.log('\n@build:: children branch >>> NOT first column');
        // console.log(groupedColumn.returnArr.values);
        groupedColumn.returnArr.values.forEach((item) => {
          // console.log(item);
          permutations.forEach((elem) => {
            // console.log(elem);
            newPermutations.push([item, ...elem]);
            // console.log(newPermutations[newPermutations - 1]);
          });
        });
      } else {
        console.log('\n@build:: children branch >>> first column');
        // console.log(groupedColumn.returnArr.values);
        groupedColumn.returnArr.values.forEach((item) => {
          // console.log(item);
          newPermutations.push([item]);
          // console.log(newPermutations[newPermutations - 1]);
        });
      }

      // column contains regular items
    } else {
      // if first column
      if (permutations.length > 0) {
        console.log('\n@build:: regular branch >>> NOT first column');
        // console.log(permutations);
        // console.log(groupedColumn.returnArr.values);
        groupedColumn.returnArr.values.forEach((item) => {
          permutations.forEach((elem) => {
            newPermutations.push([item, ...elem]);
          });
        });
      } else {
        console.log('\n@build:: regular branch >>> first column');
        // console.log(permutations);
        // console.log(groupedColumn.returnArr.values);
        groupedColumn.returnArr.values.forEach((item) => {
          newPermutations.push([item]);
        });
      }
    }

    // save new Permutations to stable permutations
    permutations = newPermutations.slice();
    console.log(`@build ${index}::permutations >>> DONE`);
    // console.log(JSON.stringify(permutations));
  });

  // determine table type
  // const numOfParents = typeArray.filter(item => item === 'parents').length;
  // if (numOfParents === 1) tableType = 'one-parent';
  // if (numOfParents > 1) tableType = 'multiple-parents';

  // return permutations array
  console.log('>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>');
  // console.log(permutations[0]);
  // return { permutations, tableType };
  // open write file
  // const outStream = fs.createWriteStream(`${outPath}/${table.tableName}.csv`);
  // write to file
  const writeArr = permutations.map((perm, index) => {
    const expectedCount = countItems(perm);
    // const countArr = [];
    // for (column of perm) {
    //   countArr.push(column.length);
    // };
    // console.log(`${table.tableName} :: permutation index = ${index} >>> ${countArr} items // ${expectedCount}`);
    // outStream.write(`${index}#${expectedCount}#${JSON.stringify(perm)}\n`);
    return `${index}#${expectedCount}#${JSON.stringify(perm)}`;
  });

  fs.writeFileSync(`${outPath}/${table.tableName}.csv`, `${writeArr.join('\n')}`);
  
  // close write stream
  // outStream.end();
};


// ////////////////////////////////////////////////////////////////////////////////////////////
// // EXPORTS
module.exports = async (downloadDate) => {
  console.log('\x1b[34m%s\x1b[0m', `PROGRESS: Create Permutations Tables\n`);
  // save path
  const inPath = `./${downloadDate}/metadata`;
  const outPath = `./${downloadDate}/permutations`;
  // read file
  const tempoL3 = readFile(`${inPath}/tempoL3.json`, 'utf8').level3;
  console.log('\x1b[34m%s\x1b[0m', `INFO: tempo level 3 array length = ${tempoL3.length}\n`);
  // process array
  // console.log(tempoL3[0]);
  // for each table create permutation array and save it to file
  tempoL3.forEach((table) => {
    // create columns array
    // const columnsArray = table.dimensionsMap;
    // build permutations
    buildPermutations(outPath, table, queryLimit);
    
  });

};