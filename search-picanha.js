import * as xlsx from 'xlsx';
import fs from 'fs';

function searchExcel(file, term) {
    if (!fs.existsSync(file)) return;
    const workbook = xlsx.read(fs.readFileSync(file), { type: 'buffer' });
    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        rows.forEach((row, index) => {
            const rowStr = JSON.stringify(row);
            if (rowStr.toLowerCase().includes(term.toLowerCase())) {
                console.log(`Match in ${file} [${sheetName}] Row ${index + 1}:`, row);
            }
        });
    });
}

searchExcel('temp_plan.xlsx', 'Picanha');
searchExcel('temp_prod.xlsx', 'Picanha');
