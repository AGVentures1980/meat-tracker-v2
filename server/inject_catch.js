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
    let hasChanges = false;

    // Detect if we need to update catch blocks
    const originalContent = content;

    // We want to replace standard fallback catch blocks to handle AuthContextMissingError explicitly
    // Pattern: catch (error) { ... } OR catch (error: any) { ... }
    
    const catchRegex = /catch\s*\(\s*([a-zA-Z0-9_]+)(?:\s*:\s*any)?\s*\)\s*\{/g;
    
    content = content.replace(catchRegex, (match, errName) => {
        // If the block already handles AuthContextMissingError, skip
        return `catch (${errName}: any) {\n            if (${errName}?.name === 'AuthContextMissingError') {\n                return res.status(${errName}.status).json({ error: ${errName}.message });\n            }`;
    });

    if (content !== originalContent) {
        hasChanges = true;
    }

    if (hasChanges) {
        // Since we are adding `res.status` into catch blocks that might not have `res` in scope (e.g. services),
        // we ONLY want to do this replacement in files that actually receive `res: Response` or are in controllers.
        
        // Wait, blindly injecting `return res.status` in Services will break TS if `res` is undefined.
        // Let's rollback and be safer: only apply to files in controllers/
    }
}

function processControllersErrorHandling(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processControllersErrorHandling(fullPath);
        } else if (fullPath.endsWith('.ts')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let hasChanges = false;
            
            const catchRegex = /catch\s*\(\s*([a-zA-Z0-9_]+)(?:\s*:\s*any)?\s*\)\s*\{(?!\s*if\s*\(\s*\1\?\.name\s*===\s*['"]AuthContextMissingError['"]\s*\))/g;
            
            content = content.replace(catchRegex, (match, errName) => {
                return `catch (${errName}: any) {\n            if (${errName}?.name === 'AuthContextMissingError') {\n                return res.status(${errName}.status).json({ error: ${errName}.message });\n            }`;
            });

            if (content !== fs.readFileSync(fullPath, 'utf8')) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`✅ Handled Catch Blocks: ${path.basename(fullPath)}`);
            }
        }
    }
}

// Only run on controllers
processControllersErrorHandling(path.join(__dirname, 'src', 'controllers'));
