// static load: $ node static.js
// get INSSE Tempo data


// import libraries
const fs = require('fs');
// import readline from 'readline';
// import path from 'path';
// import sequelize from 'sequelize';
// import http from 'http';
const axios = require('axios');
// const logger = require('../../node_modules/morgan/index');

// /////////////////////////////////////////////////////////////////////////////
// // declare functions

// // create latex file for given UAT code_siruta
async function downloadDB() {
	console.log('@INSSE::Tempo import started ... ');
	// declare variables
	const savePath = './data/metadata';
	const tempoL1Path = 'http://statistici.insse.ro:8077/tempo-ins/context/';
	const tempoL3Path = 'http://statistici.insse.ro:8077/tempo-ins/matrix/';
	const tempoL1File = `${savePath}/tempoL1.json`;
	const tempoL2File = `${savePath}/tempoL2.json`;
	const tempoL3File = `${savePath}/tempoL3.json`;
	const tempoL1 = { level1: [] };
	const tempoL2 = { level2: [] };
	const tempoL3 = { level3: [] };


	// // get tempo Level 1: Chapters + Sections
	await axios.get(tempoL1Path)
		.then((response) => {
			tempoL1.level1 = response.data;
		})
		.catch(err => console.log(err));
	console.log(`@INSSE::Level 1: tempoL1.json - ${tempoL1.level1.length} items`)
	fs.writeFile(tempoL1File, JSON.stringify(tempoL1), 'utf8', () => console.log(`@INSSE::Level 1: File tempoL1.json closed: ${tempoL1.level1.length} items`));
	console.log('@INSSE::Leves 1: Done');


	// // get tempo Level 2: Sub-Sections
	// create items list
	const l1list = tempoL1.level1.filter(item => item.level === 2);
	console.log('@INSSE::Level 2: L1 list - ', l1list.length);
	// declare query function
	async function getL2(list) {
		return Promise.all(
			list.map(async (item) => {
				const tempoL2Path = tempoL1Path + item.context.code;
				// console.log(tempoL2Path)
				return axios.get(tempoL2Path)
					.then(response => response.data)
					.catch(err => console.log(err));
			}),
		);
	}
	// run function
	tempoL2.level2 = await getL2(l1list)
		.then(res => res)
		.catch(err => console.log(err));
	// write to file
	fs.writeFile(tempoL2File, JSON.stringify(tempoL2), 'utf8', () => console.log(`@INSSE::Level 2: File tempoL2.json closed: ${tempoL2.level2.length} items`));
	console.log('@INSSE::Level 2: Done');


	// // get tempo Level 3: Tables interface
	// create tables list by concatenating the children attributes together
	let l2list = [];
	tempoL2.level2.map((item) => {
		// console.log(item.children);
		l2list = l2list.concat(item.children);
		// // select only population
		// if (item.ancestors[2].code === '10') {
		// 	l2list = l2list.concat(item.children);
		// }
	});

	// // test code for first item
	// await axios.get(tempoL3Path + l2list[0].code)
	// 	.then((response) => {
	// 		console.log(response.data);
	// 	})
	// 	.catch(err => console.log(err));

	console.log('@INSSE::Level 3: L2 list - ', l2list.length);
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
						record.tableName = item.code;
						return record;
					})
					.catch(err => console.log(err));
			}),
		);
	}
	// run function
	const itemsList = l2list;
	let iter = 0;
	// create batches of 10 items and request data
	while(itemsList.length > 0) {
		iter += 10;
		const batchList = itemsList.splice(0, 10);
		tempoL3.level3 = tempoL3.level3.concat(await getL3(batchList)
			.then((res) => {
				console.log(`L3 download: ${iter}/1319`);
				// fs.appendFileSync(tempoL3File, JSON.stringify(res), 'utf8');
				return res;
			})
			.catch(err => console.log(err)))
	}
	console.log('@INSSE:Level 3: Done reading from source');
	// write to file
	fs.writeFile(tempoL3File, JSON.stringify(tempoL3), 'utf8', () => console.log(`@INSSE::Level 3: File tempoL3.json closed: ${tempoL3.level3.length} items`));

	
	// // get tempo Level 4: Tables data


}


// ////////////////////////////////////////////////////////////////////////////
// // main area

downloadDB();
