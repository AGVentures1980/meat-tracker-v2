import path from 'path';

// Mock configuration
const SOURCE_FILE = 'RED BOOK REPORT.PDF';
const BASE_DESTINATION = '/Users/alexandregarcia/OneDrive/NPW';

function getFormattedDateFolder(): string {
    const date = new Date(); // Uses current system time

    // 1. Day of Week in English
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = days[date.getDay()];

    // 2. Date in MM/DD/YY
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = String(date.getFullYear()).slice(-2);

    const dateString = `${month}/${day}/${year}`;

    // Format: "Tuesday 02/18/26"
    return `${dayName} ${dateString}`;
}

function simulateOrganization() {
    const folderName = getFormattedDateFolder();
    const fullDestinationPath = path.join(BASE_DESTINATION, folderName);
    const destinationFile = path.join(fullDestinationPath, SOURCE_FILE);

    console.log(`\n📦 RED BOOK AUTOMATION PROTOTYPE`);
    console.log(`==================================================`);
    console.log(`📄 Input File:        ${SOURCE_FILE}`);
    console.log(`📅 Current Date:      ${new Date().toLocaleDateString()}`);
    console.log(`📂 Generated Folder:  ${folderName}`);
    console.log(`📍 Full Target Path:  ${fullDestinationPath}`);
    console.log(`🚀 Action:            MOVE '${SOURCE_FILE}' -> '${destinationFile}'`);
    console.log(`==================================================\n`);
}

simulateOrganization();
