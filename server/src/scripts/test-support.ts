import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Testing FAQ seeding...");
    const faqs = await prisma.fAQ.findMany();
    console.log(`Currently there are ${faqs.length} FAQs in the DB`);

    console.log("\nTesting Schema Relationships...");
    const testStore = await prisma.store.findFirst();
    const testUser = await prisma.user.findFirst();

    if (testStore && testUser) {
        console.log(`Found Store: ${testStore.store_name} and User: ${testUser.id}`);
        // Can we create a mock ticket?
        const ticket = await prisma.supportTicket.create({
            data: {
                store_id: testStore.id,
                user_id: testUser.id,
                title: "Test Support Verification",
            }
        });

        await prisma.supportMessage.create({
            data: {
                ticket_id: ticket.id,
                sender_type: "AI",
                content: "System Check OK"
            }
        });

        const readTicket = await prisma.supportTicket.findUnique({
            where: { id: ticket.id },
            include: { messages: true }
        });

        if (readTicket && readTicket.messages.length > 0) {
            console.log("\n✅ Database Schema and Associations are functioning properly.");
            
            // Clean up
            await prisma.supportTicket.delete({ where: { id: ticket.id }});
        }
    }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
