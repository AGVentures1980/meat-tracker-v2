import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Encontrar usuários com ponto no e-mail (TDB)
  const usersWithDots = await prisma.user.findMany({
    where: {
      email: {
        endsWith: '@texasdebrazil.com',
        contains: '.'
      }
    }
  });

  console.log(`🧹 Encontrados ${usersWithDots.length} e-mails com ponto para limpar...`);

  let countDeleted = 0;
  for (const user of usersWithDots) {
    const [localPart, domain] = user.email.split('@');
    
    // Ignorar e-mails que miraculosamente o ponto seja no domínio (impossível dado o regex, mas por segurança)
    if (!localPart.includes('.')) continue;

    const newEmail = `${localPart.replace(/\./g, '')}@${domain}`;

    // Checar se a conta sem ponto já existe
    const exactAccount = await prisma.user.findFirst({ where: { email: newEmail } });

    if (exactAccount) {
        // A conta verdadeira existe. Deletar a versão com ponto (duplicata indesejada)
        await prisma.user.delete({ where: { id: user.id } });
        console.log(`Deletada Duplicata Quebrada: ${user.email}`);
        countDeleted++;
    } else {
        // A conta sem ponto não existe, então renomeamos essa para ser a certa
        await prisma.user.update({
            where: { id: user.id },
            data: { email: newEmail }
        });
        console.log(`Renomeada para o padrão correto: ${user.email} -> ${newEmail}`);
    }
  }

  console.log(`✅ Finalizado. ${countDeleted} contas duplicadas e fora do padrão apagadas.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
