import * as xlsx from 'xlsx';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function readExcel(file) {
    try {
        if (!fs.existsSync(file)) {
            console.log(`File not found: ${file}`);
            return;
        }
        const fileBuffer = fs.readFileSync(file);
        const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        console.log(`\n--- CONTENTS OF ${file} (${sheetName}) ---`);

        // Get headers
        const json = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        if (json.length > 0) {
            console.log("Headers (Row 1):", json[0]);
            console.log("Row 2:", json[1]);
            // Search for rows with "LBS/Guest" or store names
            const data = xlsx.utils.sheet_to_json(sheet);
            console.log("Sample Data (First 3):", data.slice(0, 3));
        }
    } catch (error) {
        console.error(`Error reading ${file}:`, error);
    }
}

readExcel('temp_plan.xlsx');
readExcel('temp_prod.xlsx');
