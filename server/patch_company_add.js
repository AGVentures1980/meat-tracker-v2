const fs = require('fs');
const companyControllerPath = '/Users/alexandregarcia/Brasa-Meat-Intelligence-BACKUP/server/src/controllers/CompanyController.ts';
let code = fs.readFileSync(companyControllerPath, 'utf8');

code = code.replace(
    /const am = await prisma\.user\.create\(\{[\s\S]*?\}\);/,
    `const am = await prisma.user.create({
                data: {
                    email,
                    password_hash: hashedPassword,
                    first_name,
                    last_name,
                    role: 'area_manager',
                    // Note: Since User currently lacks company_id directly, they are strictly scoped 
                    // by their email domain and/or the store associations in getAreaManagers
                }
            });`
);

fs.writeFileSync(companyControllerPath, code);
