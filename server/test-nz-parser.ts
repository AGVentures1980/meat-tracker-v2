import { BarcodeNZParser } from './src/services/BarcodeNZParser';

const barcode = '1906533708640086353360 42-683';
const result = BarcodeNZParser.parse(barcode);

console.log(JSON.stringify(result, null, 2));
