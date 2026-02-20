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
     * Parses an NCR Net Sales PDF buffer and extracts Food Net Sales 
     * (Dinners, Lunch, Other Food, A-La-Carte Food, Dessert)
     * @param buffer PDF File Buffer
     * @returns number (Net Food Sales) or null
     */
    static async parseNetSales(buffer: Buffer): Promise<number | null> {
        try {
            const data = await pdf(buffer);
            const text = data.text;

            // Target the NCR format (Net Transaction Report)
            // It lists the categories twice, then the numbers twice.
            // "MISC" is the last category. The numbers start after the 2nd MISC.
            const lines = text.split('\n').map(l => l.trim());
            let numberBlockStart = -1;
            for (let i = 0; i < lines.length - 1; i++) {
                if (lines[i] === 'MISC' && lines[i + 1].match(/^[\d,.]+$/)) {
                    numberBlockStart = i + 1;
                    break;
                }
            }

            if (numberBlockStart !== -1) {
                const dinners = parseFloat(lines[numberBlockStart].replace(/,/g, ''));
                const lunch = parseFloat(lines[numberBlockStart + 1].replace(/,/g, ''));
                const dessert = parseFloat(lines[numberBlockStart + 2].replace(/,/g, ''));
                const otherFood = parseFloat(lines[numberBlockStart + 3].replace(/,/g, ''));
                // skip beverages, liquor, beer, wine (positions +4 to +7)
                const aLaCarte = parseFloat(lines[numberBlockStart + 8].replace(/,/g, ''));

                return Number((dinners + lunch + dessert + otherFood + aLaCarte).toFixed(2));
            }

            // Fallback for Redbook format variation
            const rbMatch = text.match(/Total Net Food Sales\s*\n\s*[\d,.]+\s*[\-\d,.]+\s*([\d,.]+)/);
            if (rbMatch) {
                return parseFloat(rbMatch[1].replace(/,/g, ''));
            }

            return null;
        } catch (error) {
            console.error('[ReportParser] Error parsing Net Sales:', error);
            return null;
        }
    }
}
