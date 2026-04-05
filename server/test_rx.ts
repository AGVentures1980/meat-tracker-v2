const inputBarcode = "0190076338879475320100083511260312210201000787";
const cleanBarcode = inputBarcode.replace(/[\(\)\[\]\s]/g, '');

// 2. Extract GTIN
const parsedGtinMatch = cleanBarcode.match(/(01|02)(\d{14})/);
let parsedGtin = null;
if (parsedGtinMatch) {
    parsedGtin = parsedGtinMatch[2];
}

console.log("FRONTEND PARSED GTIN:", parsedGtin);
