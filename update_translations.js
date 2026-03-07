const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'client/src/translations.json');
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
data.pt = data.en;
fs.writeFileSync(file, JSON.stringify(data, null, 4));
console.log('Translations updated.');
