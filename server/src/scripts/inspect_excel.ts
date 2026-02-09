
import * as XLSX from 'xlsx';

const FILE_PATH = '/Users/alexandregarcia/Downloads/Fresh Back Office Transition - Texas de Brazil Login Details.xlsx';

function inspect() {
    console.log('Reading Excel file...');
    const workbook = XLSX.readFile(FILE_PATH);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet);

    if (rows.length > 0) {
        console.log('--- Columns Found ---');
        console.log(Object.keys(rows[0]));
        console.log('--- First Row Sample ---');
        console.log(rows[0]);
    } else {
        console.log('No rows found.');
    }
}

inspect();
