const fs = require('fs');
const companyControllerPath = '/Users/alexandregarcia/Brasa-Meat-Intelligence-BACKUP/server/src/controllers/CompanyController.ts';
let code = fs.readFileSync(companyControllerPath, 'utf8');

const targetFuncStart = code.indexOf('static async getAreaManagers(req: Request, res: Response) {');
const targetFuncEnd = code.indexOf('static async assignStoresToAreaManager(req: Request, res: Response) {');

const newFunc = `static async getAreaManagers(req: Request, res: Response) {
        try {
            const user = (req as any).user;

            if (user.role !== 'admin' && user.role !== 'director') {
                return res.status(403).json({ error: 'Access Denied' });
            }

            // Find all stores for this company
            const allStores = await prisma.store.findMany({
                where: { company_id: user.companyId },
                orderBy: { store_name: 'asc' }
            });

            // Get the IDs of the stores that belong to this company
            const storeIds = allStores.map(s => s.id);

            // Fetch users with role area_manager who are EITHER assigned to at least one store in this company,
            // OR have an email matching the company domain as a fallback (since we don't have company_id on User directly)
            
            // Assuming users are scoped by their email domain if they have no stores yet
            const domain = user.email.split('@')[1];

            const areaManagers = await prisma.user.findMany({
                where: { 
                    role: 'area_manager',
                    OR: [
                        { area_stores: { some: { id: { in: storeIds } } } },
                        { email: { endsWith: '@' + domain } } // Fallback for newly created unassigned managers
                    ]
                },
                include: { area_stores: true },
                orderBy: { first_name: 'asc' }
            });

            return res.json({ areaManagers, allStores });
        } catch (error) {
            console.error('Fetch Area Managers Error:', error);
            return res.status(500).json({ error: 'Failed to fetch Area Managers' });
        }
    }

    `;

code = code.substring(0, targetFuncStart) + newFunc + code.substring(targetFuncEnd);
fs.writeFileSync(companyControllerPath, code);

console.log("Patched CompanyController");
