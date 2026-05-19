export function normalizeRawBarcode(raw: string) {
    if (!raw) return { cleaned_barcode: "", is_valid_chars: false, warnings: ['Empty scan'] };
    
    // Wedge scanners often transmit FNC1 as ASCII 29 (\x1D) or control separators.
    // We strip spaces, parentheses, brackets, and typical punctuation that scanners use for formatting.
    const cleaned_barcode = raw.replace(/[\s\r\n\t\x1D\x1E\x1F\(\)\[\]]/g, '').trim();
    const is_valid_chars = /^[a-zA-Z0-9\-]*$/.test(cleaned_barcode);
    const warnings: string[] = [];

    if (cleaned_barcode.length !== raw.length) {
        warnings.push('Formatting and control characters normalized');
    }

    return { cleaned_barcode, is_valid_chars, warnings };
}
