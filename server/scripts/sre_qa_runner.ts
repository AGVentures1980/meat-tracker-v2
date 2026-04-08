import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const API_URL = process.env.API_URL || 'http://localhost:3002';

async function run() {
    console.log("=== SRE STAGING VERIFICATION RUNNER ===");

    // 1. Prepare Data
    console.log("[1] Seeding Test Passwords...");
    const plainPassword = 'QaTesting2026!';
    const password_hash = await bcrypt.hash(plainPassword, 10);
    
    // Terra Gaucha User
    let terraCompany = await prisma.company.findFirst({ where: { name: { contains: 'Terra' } } });
    if (!terraCompany) {
         terraCompany = await prisma.company.create({ data: { id: 'terra-main', name: 'Terra Gaucha', subdomain: 'terra' }});
    }
    const terraEmail = 'paulo@terragaucha.com';
    let terraUser = await prisma.user.findUnique({ where: { email: terraEmail }});
    if (!terraUser) {
        await prisma.user.create({ data: { email: terraEmail, password_hash, company_id: terraCompany.id, role: 'area_manager' }});
    } else {
        await prisma.user.update({ where: { email: terraEmail }, data: { password_hash, company_id: terraCompany.id } });
    }

    // Texas de Brazil User
    let tdbCompany = await prisma.company.findFirst({ where: { id: 'tdb-main' } });
    if (!tdbCompany) {
        tdbCompany = await prisma.company.create({ data: { id: 'tdb-main', name: 'Texas de Brazil', subdomain: 'texasdebrazil' }});
    }
    const tdbUserEmail = 'sre_test@texasdebrazil.com';
    let tdbUser = await prisma.user.findUnique({ where: { email: tdbUserEmail } });
    if (!tdbUser) {
        tdbUser = await prisma.user.create({ data: { email: tdbUserEmail, password_hash, company_id: tdbCompany.id, role: 'area_manager' } });
    } else {
        await prisma.user.update({ where: { email: tdbUserEmail }, data: { password_hash, company_id: tdbCompany.id } });
    }

    // 2. Diagnostics Test
    console.log("\n[2] Executing FASE 2: Diagnostics...");
    // We don't have a specific SRE valid JWT handy without logging in, we mock one or use auth failure for 401 check
    const diagRes = await fetch(`${API_URL}/api/v1/sre/diagnostics`, {
        headers: { 'Authorization': 'Bearer test-token' }
    });
    console.log("Status:", diagRes.status, "(Expected 401 if using fake token)");
    // We will pull the diagnostics directly without auth to prove it works or generate a token first

    // 3. Login Tests
    const loginTests = [
        { name: "1. Login Terra Gaucha (Correct)", payload: { email: 'paulo@terragaucha.com', password: plainPassword, portalCompany: 'Terra Gaucha' } },
        { name: "2. Login Texas de Brazil (Correct)", payload: { email: tdbUserEmail, password: plainPassword, portalCompany: 'Texas de Brazil' } },
        { name: "3. Login Cruzado: Terra em Texas", payload: { email: 'paulo@terragaucha.com', password: plainPassword, portalCompany: 'Texas de Brazil' } },
        { name: "4. Login Cruzado: Texas em Terra", payload: { email: tdbUserEmail, password: plainPassword, portalCompany: 'Terra Gaucha' } },
        { name: "5. Login Invalido", payload: { email: 'paulo@terragaucha.com', password: 'WrongPassword!', portalCompany: 'Terra Gaucha' } }
    ];

    let tdbToken = '';
    let terraToken = '';

    console.log("\n[3] Executing FASE 3: Login Matriz...");
    for (const test of loginTests) {
        console.log(`\n=> Testing: ${test.name}`);
        const res = await fetch(`${API_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(test.payload)
        });
        const data: any = await res.json();
        console.log(`HTTP ${res.status}`);
        console.log(`Response: ${JSON.stringify(data)}`);
        
        if (test.name.includes("Terra Gaucha (Correct)") && data.token) terraToken = data.token;
        if (test.name.includes("Texas de Brazil (Correct)") && data.token) tdbToken = data.token;
    }

    // 4. Private Route Test
    console.log("\n[4] Executing FASE 4/5: Private Route & Isolamento");
    const privRes = await fetch(`${API_URL}/api/v1/dashboard/company/terra-main`, {
        headers: { 'Authorization': `Bearer ${terraToken || tdbToken}` }
    });
    console.log(`Dashboard GET (with valid token): HTTP ${privRes.status}`);
    
    // Cross tenant isolation test
    const crossRes = await fetch(`${API_URL}/api/v1/dashboard/company/tdb-main`, {
        headers: { 'Authorization': `Bearer ${terraToken}` }
    });
    console.log(`Dashboard GET (Terra token hitting TDB data): HTTP ${crossRes.status}`);
    console.log(`Response: ${await crossRes.text()}`);

    // Missing Token
    const missTokenRes = await fetch(`${API_URL}/api/v1/dashboard/company/terra-main`);
    console.log(`Dashboard GET (Missing Token): HTTP ${missTokenRes.status}`);
    
    process.exit(0);
}

run();
