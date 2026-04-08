const fs = require('fs');
const path = require('path');

const PROCESS_DIRS = [
    path.join(__dirname, 'src', 'controllers'),
    path.join(__dirname, 'src', 'services'),
    path.join(__dirname, 'src', 'utils'),
    path.join(__dirname, 'src', 'engine')
];

function refactorFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // 1. AST Replacements for getUserId and requireTenant
    content = content.replace(/(?:\(req\s*as\s*any\)\.user\?\.company_id\s*\|\|\s*)?(?:\(req\s*as\s*any\)\.user\?\.companyId\s*\|\|\s*)?user\.companyId\s*\|\|\s*user\.company_id\s*\|\|\s*['"]tdb-main['"]/g, 'requireTenant(user)');
    content = content.replace(/(?:\(req\s*as\s*any\)\.user\?\.company_id\s*\|\|\s*)?\(req\s*as\s*any\)\.user\?\.companyId\s*\|\|\s*['"]tdb-main['"]/g, 'requireTenant((req as any).user)');
    content = content.replace(/let\s+companyId\s*=\s*['"]tdb-main['"]\s*;/g, "let companyId = requireTenant((req as any).user);");
    content = content.replace(/user\.userId/g, 'getUserId(user)');
    content = content.replace(/\(req\s*as\s*any\)\.user\?\.userId/g, 'getUserId((req as any).user)');
    
    // DeliveryController specific un-handled regexes
    content = content.replace(/user\.companyId\s*\|\|\s*['"]tdb-main['"]/g, 'requireTenant((req as any).user)');

    const hasContextChanges = content !== originalContent;

    // 2. Error Handling Injection (Only for Controllers)
    if (filePath.includes('controllers/')) {
        const catchRegex = /catch\s*\(\s*([a-zA-Z0-9_]+)(?:\s*:\s*any)?\s*\)\s*\{(?!\s*if\s*\(\s*\1\?\.name\s*===\s*['"]AuthContextMissingError['"]\s*\))/g;
        content = content.replace(catchRegex, (match, errName) => {
            return `catch (${errName}: any) {\n            if (${errName}?.name === 'AuthContextMissingError') {\n                return res.status(${errName}.status).json({ error: ${errName}.message });\n            }`;
        });
    }

    if (content !== originalContent) {
        // Inject Import if needed
        if (hasContextChanges && !content.includes('authContext')) {
            const importStatement = "import { getUserId, requireTenant, AuthContextMissingError } from '../utils/authContext';\n";
            const lines = content.split('\n');
            let lastImportIndex = -1;
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].startsWith('import ')) lastImportIndex = i;
            }
            if (lastImportIndex !== -1) {
                lines.splice(lastImportIndex + 1, 0, importStatement);
                content = lines.join('\n');
            } else {
                content = importStatement + content;
            }
        } else if (content.includes('authContext') && !content.includes('AuthContextMissingError') && filePath.includes('controllers/')) {
            content = content.replace(
                /import\s*\{\s*getUserId,\s*requireTenant\s*\}\s*from\s*'[^']*authContext';/,
                "import { getUserId, requireTenant, AuthContextMissingError } from '../utils/authContext';"
            );
        }

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Refactored: ${path.basename(filePath)}`);
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
