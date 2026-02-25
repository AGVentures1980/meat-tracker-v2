import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure the local target folder exists
const VAULT_DIR = path.join(__dirname, '..', 'vault_ideas');
if (!fs.existsSync(VAULT_DIR)) {
    fs.mkdirSync(VAULT_DIR, { recursive: true });
}

const PROD_API_URL = 'https://meat-intelligence-final.up.railway.app/api/v1';
const AGENT_SECRET = 'agv-local-agent-sync-key-v1'; // Must match backend fallback

/**
 * Normalizes filenames securely
 */
function sanitizeFileName(name) {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

/**
 * Polls the production database for new Vault messages
 */
async function syncVault() {
    console.log(`[AGV Agent] Polling production vault at ${new Date().toISOString()}...`);
    try {
        const res = await fetch(`${PROD_API_URL}/vault/sync`, {
            headers: {
                'Authorization': `Bearer ${AGENT_SECRET}`
            }
        });

        if (!res.ok) {
            console.error(`[AGV Agent] Failed to sync. Status: ${res.status}`);
            return;
        }

        const data = await res.json();
        if (data.success && data.messages) {
            const msgs = data.messages;
            let newCount = 0;

            for (const msg of msgs) {
                // We'll create a markdown file for each message using its ID
                const safeDate = new Date(msg.created_at).toISOString().replace(/[:.]/g, '-');
                const fileName = `idea_${safeDate}_${msg.id}.md`;
                const filePath = path.join(VAULT_DIR, fileName);

                if (!fs.existsSync(filePath)) {
                    let content = `# Vault Idea - ${new Date(msg.created_at).toLocaleString()}\n\n`;
                    content += `**Sender:** ${msg.sender}\n\n`;

                    if (msg.text) {
                        content += `## Content\n${msg.text}\n\n`;
                    }

                    if (msg.file_url) {
                        content += `## Attachment\n`;
                        content += `**Name:** ${msg.file_name || 'Attached File'}\n`;
                        content += `**Type:** ${msg.file_type || 'Unknown'}\n\n`;

                        // If it's a huge base64 string, we might just want to save it as an actual file separately
                        // For now, if it's an image base64, we can embed it in the markdown so standard markdown readers can see it
                        if (msg.file_type && msg.file_type.startsWith('image/')) {
                            content += `![Attachment](${msg.file_url})\n`;
                        } else {
                            content += `*(Base64 Data URI saved in the DB, not rendered here due to size)*\n`;
                        }
                    }

                    fs.writeFileSync(filePath, content, 'utf8');
                    console.log(`[AGV Agent] 📥 Downloaded new idea: ${fileName}`);
                    newCount++;
                }
            }

            if (newCount === 0) {
                console.log(`[AGV Agent] No new vault messages found.`);
            } else {
                console.log(`[AGV Agent] Successfully synced ${newCount} new messages.`);
            }
        }
    } catch (err) {
        console.error(`[AGV Agent] Network Error during sync:`, err.message);
    }
}

// Run immediately once
syncVault();

// Then poll every 5 minutes (300,000 ms)
const POLL_INTERVAL = 5 * 60 * 1000;
setInterval(syncVault, POLL_INTERVAL);

console.log(`[AGV Agent] Vault Sync Daemon started. Polling every 5 minutes.`);
