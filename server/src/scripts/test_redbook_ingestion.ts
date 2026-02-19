import imap from 'imap-simple';
import { simpleParser } from 'mailparser';
import fs from 'fs';
import path from 'path';

// --- CONFIGURATION ---
const CONFIG = {
    user: 'alexandregarcia@texasdebrazil.com',
    password: process.env.OFFICE365_APP_PASSWORD || '', // WE NEED THIS
    host: 'outlook.office365.com',
    port: 993,
    tls: true,
    authTimeout: 10000
};

const DOWNLOAD_DIR = path.join(__dirname, '../../data_ingestion/redbook_test');

async function main() {
    if (!CONFIG.password) {
        console.error("❌ ERROR: Missing Password. Please set OFFICE365_APP_PASSWORD environment variable or edit the script temporarily.");
        return;
    }

    console.log(`🔵 Connecting to ${CONFIG.host} as ${CONFIG.user}...`);

    try {
        const connection = await imap.connect({ imap: CONFIG });
        console.log("✅ Connected!");

        await connection.openBox('INBOX');
        console.log("📂 Inbox opened. Searching for recent 'Red Book' emails...");

        // Search for emails from today/yesterday or strict subject match
        // For test, let's just grab the last 10 emails and filter by subject/attachment locally to be safe
        const searchCriteria = [
            'ALL',
            ['SINCE', new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()] // Last 48 hours
        ];

        const fetchOptions = {
            bodies: ['HEADER', 'TEXT', ''],
            struct: true,
            markSeen: false
        };

        const messages = await connection.search(searchCriteria, fetchOptions);
        console.log(`🔎 Found ${messages.length} messages in the last 48h.`);

        let found = false;

        for (const item of messages) {
            const all = item.parts.find(part => part.which === '');
            const id = item.attributes.uid;
            const idHeader = "Imap-Id: " + id + "\r\n";

            // basic parser
            const mail = await simpleParser(idHeader + all.body);

            console.log(`   - Subject: ${mail.subject}`);

            if (mail.subject && (mail.subject.toUpperCase().includes('RED BOOK') || mail.subject.toUpperCase().includes('REDBOOK'))) {
                console.log(`   🎯 MATCH FOUND! Subject: ${mail.subject}`);

                if (mail.attachments && mail.attachments.length > 0) {
                    for (const attachment of mail.attachments) {
                        if (attachment.filename && attachment.filename.toUpperCase().includes('.PDF')) {
                            console.log(`      📎 Found PDF Attachment: ${attachment.filename}`);

                            // Download
                            if (!fs.existsSync(DOWNLOAD_DIR)) {
                                fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
                            }

                            const filePath = path.join(DOWNLOAD_DIR, `${Date.now()}_${attachment.filename}`);
                            fs.writeFileSync(filePath, attachment.content);
                            console.log(`      ✅ Saved to: ${filePath}`);
                            found = true;
                        }
                    }
                } else {
                    console.log("      ⚠️ No attachments found.");
                }
            }
        }

        if (!found) {
            console.log("❌ No Red Book PDF found in recent emails.");
        }

        connection.end();

    } catch (err) {
        console.error("❌ Connection Error:", err);
    }
}

main();
