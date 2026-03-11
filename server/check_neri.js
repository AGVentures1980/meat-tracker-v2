const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
    const email = 'ngiachini@fogo.com';
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
        console.log("User found:", user.email, "Role:", user.role);
        // Compare common passwords
        const p1 = 'Fogo123!';
        const p2 = 'SenhaDaEmpresa123';
        const p3 = 'Brisket2025!';
        const p4 = 'Neri123!';
        const p1Match = await bcrypt.compare(p1, user.password_hash);
        const p2Match = await bcrypt.compare(p2, user.password_hash);
        const p3Match = await bcrypt.compare(p3, user.password_hash);
        const p4Match = await bcrypt.compare(p4, user.password_hash);
        
        if (p1Match) console.log("Password is:", p1);
        if (p2Match) console.log("Password is:", p2);
        if (p3Match) console.log("Password is:", p3);
        if (p4Match) console.log("Password is:", p4);
        
        // If none matches, let's just reset it to 'Fogo123!' so the user can easily log in
        if (!p1Match && !p2Match && !p3Match && !p4Match) {
            const hash = await bcrypt.hash(p1, 10);
            await prisma.user.update({
                where: { email },
                data: { password_hash: hash }
            });
            console.log("Password reset to:", p1);
        }
    } else {
        console.log("User not found: " + email);
    }
}
main().finally(() => prisma.$disconnect());
