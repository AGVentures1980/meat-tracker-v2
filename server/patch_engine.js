const fs = require('fs');

const dashboardControllerPath = '/Users/alexandregarcia/Brasa-Meat-Intelligence-BACKUP/server/src/controllers/DashboardController.ts';
let dbCtrl = fs.readFileSync(dashboardControllerPath, 'utf8');
dbCtrl = dbCtrl.replace(
    'const stats = await MeatEngine.getNetworkBiStats(y, w, user.companyId);',
    'const stats = await MeatEngine.getNetworkBiStats(y, w, user.companyId, user);'
);
fs.writeFileSync(dashboardControllerPath, dbCtrl);

const enginePath = '/Users/alexandregarcia/Brasa-Meat-Intelligence-BACKUP/server/src/engine/MeatEngine.ts';
let engine = fs.readFileSync(enginePath, 'utf8');
engine = engine.replace(
    'static async getNetworkBiStats(year?: number, week?: number, companyId?: string) {',
    'static async getNetworkBiStats(year?: number, week?: number, companyId?: string, user?: any) {'
);
engine = engine.replace(
    /const where: any = \{\};\n\s+if \(companyId\) \{\n\s+where\.company_id = companyId;\n\s+\}/,
    `const where: any = { };
        if (companyId) {
            where.company_id = companyId;
        }

        if (user && user.role !== 'admin' && user.role !== 'director') {
            if (user.role === 'area_manager') {
                where.area_manager_id = user.userId;
            } else if (user.storeId) {
                where.id = user.storeId;
            }
        }`
);
fs.writeFileSync(enginePath, engine);

console.log("Patched Engine and Controller");
