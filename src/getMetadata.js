// get INSSE-Tempo metadata

// import libraries
const fs = require('fs');
const axios = require('axios');


// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// // EXPORTS

// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// // get metadata from INSSE-Tempo server and save it in JSON files
module.exports = async (today) => {
	console.log('\x1b[34m%s\x1b[0m', `PROGRESS: Download Metadata`);

	console.log('@INSSE::Tempo import started ... ');
	// declare variables
	const savePath = `./${today}/metadata`;
	const tempoL1Path = 'http://statistici.insse.ro:8077/tempo-ins/context/';
	const tempoL3Path = 'http://statistici.insse.ro:8077/tempo-ins/matrix/';
	const tempoL1File = `${savePath}/tempoL1.json`;
	const tempoL2File = `${savePath}/tempoL2.json`;
	const tempoL3File = `${savePath}/tempoL3.json`;
	const tempoL1 = { level1: [] };
	const tempoL2 = { level2: [] };
	const tempoL3 = { level3: [] };

	// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// // get tempo Level 1: Chapters + Sections
	console.log('@INSSE::Level 1: START >>>');
	await axios.get(tempoL1Path)
		.then((response) => {
			tempoL1.level1 = response.data;
		})
		.catch(err => console.log(err));
	console.log(`@INSSE::Level 1: tempoL1.json - ${tempoL1.level1.length} items`);
	fs.writeFileSync(tempoL1File, JSON.stringify(tempoL1), 'utf8', () => console.log(`@INSSE::Level 1: File tempoL1.json closed: ${tempoL1.level1.length} items`));
	console.log('@INSSE::Level 1: Done');

	// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// // get tempo Level 2: Sub-Sections
	// create items list
	const l1list = tempoL1.level1.filter(item => item.level === 2);
	console.log('@INSSE::Level 2: L1 list - ', l1list.length);
	// declare query function
	async function getL2(list) {
		console.log('@INSSE::Level 2: START >>>');
		// return Promise.all(
		// 	list.map(async (item) => {
		// 		const tempoL2Path = tempoL1Path + item.context.code;
		// 		// console.log(tempoL2Path)
		// 		return axios.get(tempoL2Path)
		// 			.then(response => response.data)
		// 			.catch(err => console.log(err));
		// 	}),
		// ).catch(err => console.log(err));
		// redone requests with for loop, server did not response
		// possibly, there are new rules implemented on server
		const responseArr = [];
		for (const item of list) {
			// console.log(item);
			const tempoL2Path = tempoL1Path + item.context.code;
			responseArr.push(await axios.get(tempoL2Path)
				.then(response => response.data)
				.catch(err => console.log(err))
			);
		}
		// console.log(responseArr);
		return responseArr;
	}

	// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// run function
	tempoL2.level2 = await getL2(l1list)
		.then(res => res)
		.catch(err => console.log(err));
	// write to file
	fs.writeFileSync(tempoL2File, JSON.stringify(tempoL2), 'utf8', () => console.log(`@INSSE::Level 2: File tempoL2.json closed: ${tempoL2.level2.length} items`));
	console.log('@INSSE::Level 2: Done');


	// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// // get tempo Level 3: Tables interface
	// create tables list by concatenating the children attributes together
	let l2list = [];
	tempoL2.level2.map((item) => {
		// console.log(item.children);
		l2list = l2list.concat(item.children);
	});
	const l3listLength = l2list.length;
	console.log('@INSSE::Level 3: START >>>');
	console.log('@INSSE::Level 3: L2 list - ', l3listLength);

	// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// declare query function
	async function getL3(list) {
		return Promise.all(
			list.map(async (item) => {
				const requestPath = tempoL3Path + item.code;
				// console.log(requestPath)
				return axios.get(requestPath)
					.then((response) => {
						// console.log(response.data);
						const record = response.data;
						// insert table name
						record.tableName = item.code;
						// prepare table prefix
						const ancestors = tempoL1.level1;
						const tableCode = record.ancestors[3].code;
						const parentCode = record.ancestors[2].code;
						const tableIndex = ancestors.filter(item => item.context.code === tableCode)[0].context.name.split(' ')[0].replace('.', '');
						const ancestorPrefix = ancestors.filter(item => item.context.code === parentCode)[0].context.name.split(' ')[0];
						// insert table prefix
						record.tablePrefix = `${ancestorPrefix}.${tableIndex}`;
						return record;
					})
					.catch(err => console.log(err));
			}),
		);
	}

	// ///////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// run function
	const itemsList = l2list;
	let iter = 0;
	// create batches of 10 items and request data
	while(itemsList.length > 0) {
		iter += 10;
		const batchList = itemsList.splice(0, 10);
		tempoL3.level3 = tempoL3.level3.concat(await getL3(batchList)
			.then((res) => {
				console.log(`L3 download: ${iter}/${l3listLength} (@${today})`);
				// fs.appendFileSync(tempoL3File, JSON.stringify(res), 'utf8');
				return res;
			})
			.catch(err => console.log(err)));
	}
	console.log('@INSSE:Level 3: Done reading from source');
	// write to file
	fs.writeFileSync(tempoL3File, JSON.stringify(tempoL3), 'utf8', () => console.log(`@INSSE::Level 3: File tempoL3.json closed: ${tempoL3.level3.length} items`));
};
