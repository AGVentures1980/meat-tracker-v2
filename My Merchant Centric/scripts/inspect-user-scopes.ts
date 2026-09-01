import { db } from '../src/lib/db';

async function inspectUserScopes() {
  const users = await db.user.findMany({
    include: {
      scopes: true,
      roles: true
    }
  });

  console.log(`Found ${users.length} users in DB:`);
  users.forEach(u => {
    console.log(`User: ${u.email}`);
    console.log(`  Roles:`, u.roles.map(r => r.role));
    console.log(`  Scopes:`, u.scopes.map(s => `${s.scopeType}: ${s.scopeId}`));
  });
}

inspectUserScopes().catch(console.error);
