import pdf from 'pdf-parse';

export class ReportParserService {
    /**
     * Parses a Redbook PDF buffer and extracts Lunch/Dinner guests
     * @param buffer PDF File Buffer
     * @returns { lunchGuests: number, dinnerGuests: number }
     */
    static async parseRedbook(buffer: Buffer): Promise<{ lunchGuests: number, dinnerGuests: number }> {
        try {
            const data = await pdf(buffer);
            const text = data.text;

            // 1. Find the "10 - ALL DAY" section to get totals
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
        } catch (error) {
            console.error('[ReportParser] Error parsing Redbook:', error);
            return { lunchGuests: 0, dinnerGuests: 0 };
        }
    }

    /**
     * Parses an NCR Net Sales PDF buffer and extracts Net Sales
     * @param buffer PDF File Buffer
     * @returns number (Net Sales) or null
     */
    static async parseNetSales(buffer: Buffer): Promise<number | null> {
        try {
            const data = await pdf(buffer);
            const text = data.text;

            // Target the NCR format first
            const subTotalMatch = text.match(/Sub Total:\s*([\d,.]+)/);
            if (subTotalMatch) {
                return parseFloat(subTotalMatch[1].replace(/,/g, ''));
            }

            // Fallback for variation
            const netSalesMatch = text.match(/Total Net Sales\s*\n\s*([\-\d,.]+)\s*\n/);
            if (netSalesMatch) {
                return parseFloat(netSalesMatch[1].replace(/,/g, ''));
            }

            return null;
        } catch (error) {
            console.error('[ReportParser] Error parsing Net Sales:', error);
            return null;
        }
    }
}
