const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');

require('dotenv').config();

async function main() {
  const user = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (!user) { console.log("NO ADMIN"); return; }
  
  const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });

  const contract = await prisma.contractDocument.create({
    data: {
      company_name: 'DELETE TEST HTTP',
      signer_name: 'Test',
      signer_email: 'test@example.com',
      price: 100,
      locations_count: 1,
      status: 'DRAFT'
    }
  });
  console.log('Created:', contract.id);
  
  const apiUrl = 'http://localhost:' + (process.env.PORT || 3002);
  const response = await fetch(`${apiUrl}/api/v1/contracts/${contract.id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const text = await response.text();
  console.log('Response Status:', response.status);
  console.log('Response Body:', text);
  
  // Cleanup just in case
  try { await prisma.contractDocument.delete({ where: { id: contract.id } }); } catch (e) {}
}
main().catch(console.error).finally(() => prisma.$disconnect());
