const fs = require('fs');

function parseRedbook(text) {
    // 1. Find the "10 - ALL DAY" section to get totals, or extract from specific pages
    const allDayIndex = text.indexOf("10 - ALL DAY");
    let searchArea = text;
    if (allDayIndex !== -1) {
        searchArea = text.substring(allDayIndex);
    }

    // Match "DINNERS\n [number]" or "DINNERS \n [number]"
    const dinnerMatch = searchArea.match(/DINNERS\s*\n\s*(\d+)/);
    const lunchMatch = searchArea.match(/LUNCH\s*\n\s*(\d+)/);

    const dinnerGuests = dinnerMatch ? parseInt(dinnerMatch[1], 10) : 0;
    const lunchGuests = lunchMatch ? parseInt(lunchMatch[1], 10) : 0;

    return { lunchGuests, dinnerGuests };
}

function parseNetSales(text) {
    // Net sales can be "Sub Total: 16,911.13" in NCR
    // Or "Total Net Sales\n-567.10\nTotal DiscountsTotal Gross Sales\n 24,644.59" -> Wait, 24644.59 - 567.10 = 24077.49.
    // In RedBook, the format is a bit weird. let's check Net Transaction Report:
    const subTotalMatch = text.match(/Sub Total:\s*([\d,.]+)/);
    if (subTotalMatch) {
        return parseFloat(subTotalMatch[1].replace(/,/g, ''));
    }

    // Fallback or Redbook specific 
    const netSalesMatch = text.match(/Total Net Sales\s*\n\s*([\-\d,.]+)\s*\n/);
    if (netSalesMatch) {
        return parseFloat(netSalesMatch[1].replace(/,/g, ''));
    }

    return null;
}

const redbookText = fs.readFileSync('REDBOOK REPORT.pdf.txt', 'utf8');
const ncrText = fs.readFileSync('NET TRANSACTION REPORT.pdf.txt', 'utf8');

console.log("=== REDBOOK ===");
console.log(parseRedbook(redbookText));

console.log("=== NCR NET SALES ===");
console.log({ netSales: parseNetSales(ncrText) });
