export function normalizeRawBarcode(raw: string) {
    if (!raw) return { cleaned_barcode: "", is_valid_chars: false, warnings: ['Empty scan'] };
    
    const cleaned_barcode = raw.replace(/[\r\n\t]/g, '').trim();
    const is_valid_chars = /^[a-zA-Z0-9\-\(\)\[\]]*$/.test(cleaned_barcode);
    const warnings: string[] = [];

    if (cleaned_barcode.length !== raw.length) {
        warnings.push('Hidden wedge characters stripped');
    }

    return { cleaned_barcode, is_valid_chars, warnings };
}
