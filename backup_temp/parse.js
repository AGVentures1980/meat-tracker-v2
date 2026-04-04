const xlsx = require('xlsx');
const path = require('path');

const filePath = '/Users/alexandregarcia/Brasa-Meat-Intelligence-BACKUP/Tampa - Inventory December 2025 (1).xlsm';
const workbook = xlsx.readFile(filePath);

console.log("SHEETS:", workbook.SheetNames);

workbook.SheetNames.slice(0, 3).forEach(sheetName => {
  console.log(`\n\n=== SHEET: ${sheetName} ===`);
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(JSON.stringify(data.slice(0, 15), null, 2));
});
