const fs = require('fs');
const path = require('path');

const PROCESS_DIRS = [
    path.join(__dirname, 'src', 'services'),
    path.join(__dirname, 'src', 'utils'),
    path.join(__dirname, 'src', 'engine')
];

function refactorFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let hasChanges = false;

    // 1. Detect if we need the helpers
    const needsTenant = content.includes("'tdb-main'") || content.includes('"tdb-main"') || content.includes('user.companyId') || content.includes('company_id');
    const needsUserId = content.includes('.userId');
    
    if (!needsTenant && !needsUserId) return;

    // 2. Replacements
    // Replace `user.companyId || 'tdb-main'` and its variants
    const originalContent = content;

    content = content.replace(/(?:\(req\s*as\s*any\)\.user\?\.company_id\s*\|\|\s*)?(?:\(req\s*as\s*any\)\.user\?\.companyId\s*\|\|\s*)?user\.companyId\s*\|\|\s*user\.company_id\s*\|\|\s*['"]tdb-main['"]/g, 'requireTenant(user)');
    content = content.replace(/(?:\(req\s*as\s*any\)\.user\?\.company_id\s*\|\|\s*)?\(req\s*as\s*any\)\.user\?\.companyId\s*\|\|\s*['"]tdb-main['"]/g, 'requireTenant((req as any).user)');
    
    // Sometimes it's structured like: let companyId = "tdb-main";
    content = content.replace(/let\s+companyId\s*=\s*['"]tdb-main['"]\s*;/g, "let companyId = requireTenant((req as any).user);");

    // Replace user.userId -> getUserId(user)
    content = content.replace(/user\.userId/g, 'getUserId(user)');
    content = content.replace(/\(req\s*as\s*any\)\.user\?\.userId/g, 'getUserId((req as any).user)');

    if (content !== originalContent) {
        hasChanges = true;
    }

    // 3. Inject Imports
    if (hasChanges && !content.includes('authContext')) {
        const importStatement = "import { getUserId, requireTenant } from '../utils/authContext';\n";
        // Find last import
        const lines = content.split('\n');
        let lastImportIndex = -1;
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].startsWith('import ')) {
                lastImportIndex = i;
            }
        }
        
        if (lastImportIndex !== -1) {
            lines.splice(lastImportIndex + 1, 0, importStatement);
            content = lines.join('\n');
        } else {
            content = importStatement + content;
        }
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Refactored: ${path.basename(filePath)}`);
    } else if (hasChanges) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Refactored (imports already present): ${path.basename(filePath)}`);
    }
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walk(fullPath);
        } else if (fullPath.endsWith('.ts')) {
            refactorFile(fullPath);
        }
    }
}

for (const dir of PROCESS_DIRS) {
    if (fs.existsSync(dir)) walk(dir);
}
