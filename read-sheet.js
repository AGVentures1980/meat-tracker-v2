import * as xlsx from 'xlsx';
import fs from 'fs';

function readSheet(file, sheetName, rowsToRead) {
    if (!fs.existsSync(file)) return;
    const workbook = xlsx.read(fs.readFileSync(file), { type: 'buffer' });
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    console.log(`\n--- ${file} [${sheetName}] ---`);
    rows.slice(0, rowsToRead).forEach((row, i) => console.log(`Row ${i + 1}:`, row));
}

readSheet('temp_prod.xlsx', 'Previsao Consumo', 30);
