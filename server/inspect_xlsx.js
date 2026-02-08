
const XLSX = require('xlsx');
const path = require('path');

const filePath = '/Users/alexandregarcia/Downloads/Fresh Back Office Transition - Texas de Brazil Login Details.xlsx';

try {
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;

    console.log('Sheets found:', sheetNames);

    sheetNames.forEach(sheetName => {
        console.log(`\n--- Sheet: ${sheetName} ---`);
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Array of arrays

        // Log first 5 rows
        console.log(json.slice(0, 5));

        // Check for specific columns
        const headers = json[0] || [];
        console.log('Headers:', headers);

        // partial match check
        if (headers.some(h => h && h.toString().toLowerCase().includes('lbs'))) {
            console.log('FOUND LBS COLUMN!');
        }
    });

} catch (err) {
    console.error('Error reading file:', err);
}
