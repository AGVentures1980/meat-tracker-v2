const bcrypt = require('bcryptjs');

async function test() {
    const plainPassword = 'TDB2026@';
    
    // Test 1: Generate hash strictly with bcryptjs
    const passwordHash = await bcrypt.hash(plainPassword, 10);
    console.log("Generated:", passwordHash);
    
    // Test 2: Immediately verify
    const verifyInMemory = await bcrypt.compare(plainPassword, passwordHash);
    console.log("Memory Verfies:", verifyInMemory);
    
    // Test 3: Stringify exactly as Prisma would serialize
    const serialized = JSON.stringify({ password_hash: passwordHash });
    const parsed = JSON.parse(serialized).password_hash;
    console.log("Parsed verifies:", await bcrypt.compare(plainPassword, parsed));
}
test();
