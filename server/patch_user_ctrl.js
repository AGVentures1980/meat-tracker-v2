const fs = require('fs');
const ctrlPath = '/Users/alexandregarcia/Brasa-Meat-Intelligence-BACKUP/server/src/controllers/UserController.ts';
let code = fs.readFileSync(ctrlPath, 'utf8');

// Add getHierarchy directly to UserController
const hierarchyMethod = `
    getHierarchy: async (req: Request, res: Response) => {
        try {
            const user = (req as any).user;
            const { layer } = req.query;

            // Only Directors and Area Managers can query the corporate hierarchy
            if (user.role !== 'admin' && user.role !== 'director' && user.role !== 'area_manager') {
                return res.status(403).json({ error: 'Access Denied' });
            }

            if (layer === 'gms') {
                // Return Store Managers (is_primary = true)
                
                // If Area Manager: only return GMs from their assigned stores
                let storeIds: number[] = [];
                
                if (user.role === 'area_manager') {
                    const myStores = await prisma.store.findMany({
                        where: { area_manager_id: user.userId },
                        select: { id: true }
                    });
                    storeIds = myStores.map(s => s.id);
                } else {
                    // If Director/Admin, get all stores for the company
                    const allStores = await prisma.store.findMany({
                        where: { company_id: user.companyId },
                        select: { id: true }
                    });
                    storeIds = allStores.map(s => s.id);
                }

                if (storeIds.length === 0) {
                    return res.json({ success: true, managers: [] });
                }

                const managers = await prisma.user.findMany({
                    where: { 
                        store_id: { in: storeIds },
                        is_primary: true
                    },
                    select: {
                        id: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                        role: true,
                        position: true,
                        created_at: true,
                        store: {
                            select: { id: true, store_name: true }
                        }
                    },
                    orderBy: { first_name: 'asc' }
                });

                return res.json({ success: true, managers });
            }

            return res.status(400).json({ error: 'Invalid layer requested' });

        } catch (error) {
            console.error('getHierarchy error:', error);
            res.status(500).json({ error: 'Failed to fetch hierarchy' });
        }
    },
`;

code = code.replace('export const UserController = {', 'export const UserController = {' + hierarchyMethod);

// Update createStoreUser to handle is_primary
code = code.replace(
    /const { first_name, last_name, email, password, position } = req\.body;/,
    `const { first_name, last_name, email, password, position, is_primary } = req.body;`
);

code = code.replace(
    /force_change: true\s+\},/m,
    `force_change: true,
                    is_primary: is_primary === true
                },`
);

fs.writeFileSync(ctrlPath, code);

// Add Route to user.routes.ts
const routesPath = '/Users/alexandregarcia/Brasa-Meat-Intelligence-BACKUP/server/src/routes/user.routes.ts';
let routes = fs.readFileSync(routesPath, 'utf8');
routes = routes.replace(
    "router.get('/store'",
    "router.get('/hierarchy', requireAuth, requireRole([Role.admin, Role.director, Role.area_manager]), UserController.getHierarchy);\nrouter.get('/store'"
);
fs.writeFileSync(routesPath, routes);

console.log("Patched UserController and Routes");
