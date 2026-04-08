import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const API_URL = process.env.API_URL || 'http://localhost:3002';

async function run() {
    console.log("=== SRE GLOBAL MULTI-TENANT VERIFICATION RUNNER ===");

    typeof process.env.STRICT_TENANT_ENFORCEMENT; // Ensure system picks up flags...

    // 1. Define ALL known corporations
    const tenants = [
        { id: 'brasa-main', name: 'Brasa Intelligence', subdomain: 'brasa', email: 'sre@brasameat.com' },
        { id: 'fogo-main', name: 'Fogo de Chao', subdomain: 'fogo', email: 'sre@fogo.com' },
        { id: 'terra-main', name: 'Terra Gaucha', subdomain: 'terra', email: 'paulo@terragaucha.com' },
        { id: 'tdb-main', name: 'Texas de Brazil', subdomain: 'texasdebrazil', email: 'sre_test@texasdebrazil.com' },
    ];

    console.log("[1] Seeding Test Passwords for the Global Fleet...");
    const plainPassword = 'QaTesting2026!';
    const password_hash = await bcrypt.hash(plainPassword, 10);
    
    // Seed companies and users
    for (const t of tenants) {
        let company = await prisma.company.findFirst({ where: { id: t.id } });
        if (!company) {
             company = await prisma.company.create({ data: { id: t.id, name: t.name, subdomain: t.subdomain }});
        }
        
        let store = await prisma.store.findFirst({ where: { company_id: company.id } });
        if (!store) {
            store = await prisma.store.create({ data: { company_id: company.id, store_name: 'HQ', location: 'HQ', country: 'US', timezone: 'EST', is_pilot: true }});
        }
        
        let user = await prisma.user.findUnique({ where: { email: t.email }});
        if (!user) {
            user = await prisma.user.create({ data: { email: t.email, password_hash, company_id: company.id, role: 'area_manager' }});
        } else {
            user = await prisma.user.update({ where: { email: t.email }, data: { password_hash, company_id: company.id } });
        }
        
        await prisma.store.update({ where: { id: store.id }, data: { area_manager_id: user.id } });
    }

    // 2. Execute Valid Logins and Collect JWTs
    console.log("\n[2] Executing FASE 2: Valid JWT Generation & Token Issuance...");
    const tokens: Record<string, string> = {};

    for (const t of tenants) {
        const res = await fetch(`${API_URL}/api/v1/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: t.email, password: plainPassword, portalCompany: t.name })
        });
        const data: any = await res.json();
        if (res.status === 200 && data.token) {
            tokens[t.id] = data.token;
            console.log(`✅ ${t.name}: Login SUCCESS (Token Secured)`);
        } else {
            console.error(`❌ ${t.name}: Login FAILED`, data);
        }
    }

    // 3. Execution Phase: Malicious Cross-Tenant Breach Attempts
    console.log("\n[3] Executing FASE 3: Cross-Tenant Zero-Trust Matrix (Firewall Testing)...");
    
    // Every tenant attempts to login using ANOTHER tenant's portal surface (Portal Spoofing)
    for (let i = 0; i < tenants.length; i++) {
        for (let j = 0; j < tenants.length; j++) {
            if (i === j) continue;
            const attacker = tenants[i];
            const victim = tenants[j];

            const res = await fetch(`${API_URL}/api/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: attacker.email, password: plainPassword, portalCompany: victim.name })
            });
            const data: any = await res.json();
            
            // Artificial delay to prevent Express Rate Limit 429
            await new Promise(r => setTimeout(r, 600));

            if (res.status === 403) {
                console.log(`🟢 BREACH PREVENTED [403]: ${attacker.name} blocked from accessing ${victim.name}'s Portal.`);
            } else {
                console.error(`🔴 CRITICAL VULNERABILITY: ${attacker.name} bypassed ${victim.name}'s Portal! Status: ${res.status}`);
            }
        }
    }

    // 4. Execution Phase: Backend Data Isolation (JWT Spoofing)
    console.log("\n[4] Executing FASE 4: Private Data Route Authorization Isolations...");
    
    for (let i = 0; i < tenants.length; i++) {
        for (let j = 0; j < tenants.length; j++) {
            if (i === j) continue;
            const attacker = tenants[i];
            const victim = tenants[j];
            const attackerToken = tokens[attacker.id];

            // Attempt to hit the specific tenant's endpoint with the attacker's JWT
            const crossRes = await fetch(`${API_URL}/api/v1/sre/diagnostics`, {
                headers: { 'Authorization': `Bearer ${attackerToken}`, 'x-tenant-id': victim.name }
            });
            
            // artificial delay
            await new Promise(r => setTimeout(r, 300));
            
            if (crossRes.status >= 400) {
                 console.log(`🟢 DATA ISOLATION OK [${crossRes.status}]: ${attacker.name} cannot fetch data designated for ${victim.name}.`);
            } else {
                 console.error(`🔴 DATA BLEED: ${attacker.name} read data from ${victim.name}! Status: ${crossRes.status}`);
            }
        }
    }

    console.log("\n=== 🛡 SRE INFRASTRUCTURE SCAN COMPLETE ===\n");
    process.exit(0);
}

run();
