const fs = require('fs');
const pdf = require('pdf-parse');

async function parse() {
    const file = process.argv[2];
    const dataBuffer = fs.readFileSync(file);
    const data = await pdf(dataBuffer);
    fs.writeFileSync(file + '.txt', data.text);
    console.log("Parsed", file);
}

parse().catch(console.error);
