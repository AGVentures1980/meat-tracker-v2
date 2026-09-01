import fs from 'fs';
import { parse } from 'csv-parse/sync';

const weeklyPath = '/Users/alexandregarcia/Downloads/ReviewsReport_weekly_20260817_7bf72489-3a50-45c9-aa07-b543c757fcd2.csv';
const raw = fs.readFileSync(weeklyPath, 'utf8');
const rows: any[] = parse(raw, { columns: true, skip_empty_lines: true, trim: true });

const targetIds = ['OT-60256-1000079502-190006866829', 'OT-60256-1000078579-190006866829'];

console.log('--- INSPECTING TARGET CSV ROWS ---');
rows.forEach((r, idx) => {
  const revId = (r['Review ID'] || '').trim();
  if (targetIds.includes(revId)) {
    console.log(`Row #${idx + 1}: Review ID: ${revId}`);
    console.log(`  Source: ${r['Source']}`);
    console.log(`  Guest Name: "${r['Guest name']}"`);
    console.log(`  Overall Rating: ${r['Overall rating']}`);
    console.log(`  Review Comments: "${r['Review comments']}"`);
    console.log(`  Review Date: "${r['Review date']}"`);
  }
});
