import fs from 'fs';
import path from 'path';
const pdf = require('pdf-parse');

const MANUAL_DIR = path.join(__dirname, '../../manual_ingest');

async function main() {
    try {
        if (!fs.existsSync(MANUAL_DIR)) {
            console.error(`❌ Directory not found: ${MANUAL_DIR}`);
            return;
        }
        const files = fs.readdirSync(MANUAL_DIR).filter((f: string) => f.toLowerCase().endsWith('.pdf'));

        if (files.length === 0) {
            console.error("❌ No PDF found in manual_ingest folder.");
            return;
        }


        // Clean text for easier regex: split by spaces or known markers
        // But the raw Stream showed: "1,529.58LUNCH COMPS 2-38.00LUNCH 42 1,567.58"

        // Strategy: Look for "LUNCH" followed immediately or after space by a number, then a monetary amount.
        // The pattern "LUNCH <digits> <money>" seems consistent for the summary line?
        // Or "LUNCH" pattern in the breakdown.

        // --- REFINED PARSING LOG IC ---
        // Lunch Section starts with "1 - LUNCH" -> Total line -> 3rd number
        // Dinner Section starts with "2 - DINNER" -> Total line -> 3rd number

        const extractGuestsFromSection = (lines: string[], sectionHeader: string): number => {
            let inSection = false;
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                if (lines[i].includes(sectionHeader)) {
                    inSection = true;
                    continue;
                }

                if (inSection && line.includes('GROSS SALES')) {
                    inSection = false;
                }

                if (inSection && line === 'Total') {
                    const nextLine = lines[i + 1];
                    if (nextLine) {
                        const nums = nextLine.match(/(\d[\d,]*\.\d+|\d+)/g);
                        if (nums && nums.length >= 3) {
                            return parseInt(nums[2].replace(/,/g, ''));
                        }
                    }
                }
            }
            return 0;
        };

        for (const filename of files) {
            const filePath = path.join(MANUAL_DIR, filename);
            const dataBuffer = fs.readFileSync(filePath);

            const data = await pdf(dataBuffer);
            const text = data.text;
            const lines = text.split('\n').map((line: string) => line.trim()).filter((line: string) => line.length > 0);

            // 1. Look for Date
            const dateMatch = text.match(/Date:\s*(\d{1,2}\/\d{1,2}\/\d{2,4})/i) || text.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
            const date = dateMatch ? dateMatch[1] : "Unknown Date";

            // 2. Look for Location (Heuristic: Line 3 usually, or lines before "Printed on")
            // Sample:
            // REDBOOK REPORT
            // Z.BARRIOS, JUAN
            // Tampa  - Tampa
            // Printed on ...
            let location = "Unknown Location";
            if (lines.length >= 3) {
                // It's often the 3rd line.
                // But let's look for the line *before* "Printed on" if possible, or just take line 2 (0-indexed)
                const printedOnIndex = lines.findIndex((l: string) => l.includes("Printed on"));
                if (printedOnIndex > 0) {
                    location = lines[printedOnIndex - 1];
                } else {
                    location = lines[2] || lines[1];
                }
            }

            const lunchCount = extractGuestsFromSection(lines, '1 - LUNCH');
            const dinnerCount = extractGuestsFromSection(lines, '2 - DINNER');

            console.log(`\n📄 Report: ${filename} (system formatted)`);
            console.log(`   📍 Location: ${location}`);
            console.log(`   📅 Date:     ${date}`);
            console.log(`   🥗 Lunch:    ${lunchCount}`);
            console.log(`   🍷 Dinner:   ${dinnerCount}`);
            console.log(`   ✅ Total:    ${lunchCount + dinnerCount}`);
        }
    } catch (err) {
        console.error("❌ Parser Error:", err);
    }
}

main();
