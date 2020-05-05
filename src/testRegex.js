let paragraph = 'total';

let capturingRegex = /((?<siruta>\d+)\s)?(?<uat>.*)/gm;
found = capturingRegex.exec(paragraph);
console.log(found);