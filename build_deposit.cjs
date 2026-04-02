const fs = require('fs');
const files = [
  'COPYRIGHT.txt',
  'server/src/controllers/InvoiceController.ts',
  'server/src/controllers/DashboardController.ts',
  'server/src/services/visionService.ts',
  'client/src/components/NetworkReportCard.tsx',
  'client/src/components/layouts/DashboardLayout.tsx'
];

let out = '';
for(const f of files) {
  if(fs.existsSync(f)) {
    out += `\n\n=============================================================================\n`;
    out += `FILE: ${f}\n`;
    out += `=============================================================================\n\n`;
    out += fs.readFileSync(f, 'utf8');
  }
}
fs.writeFileSync('BRASA_MEAT_INTELLIGENCE_OS_SOURCE_CODE_DEPOSIT.txt', out);
console.log('Deposit Generated Successfully.');
