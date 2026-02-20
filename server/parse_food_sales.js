const fs = require('fs');

const text = fs.readFileSync('NET TRANSACTION REPORT.pdf.txt', 'utf8');
const redbookText = fs.readFileSync('REDBOOK REPORT.pdf.txt', 'utf8');

// Try REDBOOK Total Net Food Sales first
// Format: "Total Gross Food SalesTotal Discount Food SalesTotal Net Food Sales\n 22,737.09-556.60 22,180.49"
const rbMatch = redbookText.match(/Total Net Food Sales\s*\n\s*[\d,.]+\s*[\-\d,.]+\s*([\d,.]+)/);
console.log("REDBOOK Net Food Sales:", rbMatch ? rbMatch[1] : "Not found");

// Try NCR sequence
// We know it lists 10 labels twice, then 10 amounts twice, then averages.
// Let's find the block of numbers after "MISC" "MISC"
const lines = text.split('\n').map(l => l.trim());
let numberBlockStart = -1;
for (let i = 0; i < lines.length - 1; i++) {
    if (lines[i] === 'MISC' && lines[i+1].match(/^[\d,.]+$/)) {
        numberBlockStart = i + 1;
        break;
    }
}

if (numberBlockStart !== -1) {
    const dinners = parseFloat(lines[numberBlockStart].replace(/,/g, ''));
    const lunch = parseFloat(lines[numberBlockStart+1].replace(/,/g, ''));
    // dessert is +2
    const otherFood = parseFloat(lines[numberBlockStart+3].replace(/,/g, ''));
    // bev +4, liq +5, beer +6, wine +7
    const aLaCarte = parseFloat(lines[numberBlockStart+8].replace(/,/g, ''));
    
    console.log("NCR Extraction:");
    console.log("DINNERS:", dinners);
    console.log("LUNCH:", lunch);
    console.log("OTHER FOOD:", otherFood);
    console.log("A-LA-CARTE:", aLaCarte);
    console.log("TOTAL FOOD ONLY:", dinners + lunch + otherFood + aLaCarte);
}
