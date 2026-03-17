import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
import { startOfDay, endOfDay, subDays, differenceInDays } from 'date-fns';

const prisma = new PrismaClient();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// The pilot start date. Could eventually be pulled from Store.pilot_start_date
const PILOT_START_DATE = new Date('2026-03-01T00:00:00.000Z');

export class PilotAuditorService {
  /**
   * Run the daily audit for a specific store and date.
   */
  static async runDailyAudit(storeId: number, targetDate: Date = subDays(new Date(), 1)) {
    try {
      const store = await prisma.store.findUnique({
        where: { id: storeId },
        include: {
          company: true
        }
      });

      if (!store) throw new Error('Store not found.');

      const dayNumber = differenceInDays(targetDate, PILOT_START_DATE) + 1;
      const start = startOfDay(targetDate);
      const end = endOfDay(targetDate);

      // 1. Fetch Inventory Records for the day
      const inventoryRecords = await prisma.inventoryRecord.findMany({
        where: { store_id: storeId, date: { gte: start, lte: end } }
      });

      // 2. Fetch Waste Logs
      const wasteLogs = await prisma.wasteLog.findMany({
        where: { store_id: storeId, date: { gte: start, lte: end } }
      });

      // 3. Fetch Purchases/Invoices
      const purchases = await prisma.purchaseRecord.findMany({
        where: { store_id: storeId, date: { gte: start, lte: end } }
      });
      
      const invoices = await prisma.invoiceRecord.findMany({
        where: { store_id: storeId, date: { gte: start, lte: end } }
      });

      // 4. Fetch Meat Usage (Sales Mix)
      const meatUsage = await prisma.meatUsage.findMany({
        where: { store_id: storeId, date: { gte: start, lte: end } }
      });

      // Format Data for AI
      const rawData = {
        store_name: store.store_name,
        date: targetDate.toISOString(),
        day_number: dayNumber,
        baseline_yield: store.company.baseline_yield || store.baseline_yield_ribs || 74.0,
        baseline_loss_pct: store.company.baseline_loss_pct || store.baseline_loss_rate || 20.0,
        meat_usage: meatUsage.map(m => ({ protein: m.protein, lbs: m.lbs_total })),
        purchases: purchases.map(p => ({ item: p.item_name, lbs: p.quantity, cost: p.cost_total })),
        invoices: invoices.map(i => ({ item: i.item_name, lbs: i.quantity, cost: i.cost_total })),
        waste: wasteLogs.map(w => ({ items: w.items }))
      };

      const systemPrompt = `You are the Brasa Meat Intelligence Executive AI Auditor.
      Your job is to analyze the daily meat consumption, waste, and invoices for a steakhouse pilot program.
      The pilot is focused on finding inefficiencies in:
      1. Meat Rotation on the floor (Are they serving too much expensive red meat instead of high-margin chicken/pork?)
      2. Yield Loss (Are suppliers sending out-of-spec, overly fat meat driving up costs?)
      
      Review this JSON data for the day and extract the exact yield savings in USD (or loss), a daily operational score (0-100), and short strategic insights.
      Calculate an estimated financial 'yield_savings_usd' based on lower waste/better yield vs the baseline properties.
      If data is empty, assume $0 savings.
      
      Return a STRICT JSON response adhering to this schema:
      {
        "daily_score": number, // 0-100 evaluating the day's performance based on the usage/waste ratio
        "yield_savings_usd": number, // Positive float for money saved, negative for money lost relative to baseline waste.
        "meat_rotation_insight": "string", // A 1-2 sentence blunt insight about the mix of proteins served
        "ai_executive_summary": "string" // A concise summary connecting the supplier yield and the floor rotation to the bottom line
      }`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(rawData) }
        ],
        response_format: { type: 'json_object' }
      });

      const aiResult = JSON.parse(response.choices[0].message.content || '{}');

      // Save to database
      const auditRecord = await prisma.pilotDailyAudit.upsert({
        where: {
          store_id_audit_date: {
            store_id: storeId,
            audit_date: startOfDay(targetDate)
          }
        },
        update: {
          day_number: dayNumber,
          daily_score: aiResult.daily_score || 0,
          yield_savings_usd: aiResult.yield_savings_usd || 0,
          meat_rotation_insight: aiResult.meat_rotation_insight || 'No data.',
          ai_executive_summary: aiResult.ai_executive_summary || 'No data.'
        },
        create: {
          store_id: storeId,
          audit_date: startOfDay(targetDate),
          day_number: dayNumber,
          daily_score: aiResult.daily_score || 0,
          yield_savings_usd: aiResult.yield_savings_usd || 0,
          meat_rotation_insight: aiResult.meat_rotation_insight || 'No data.',
          ai_executive_summary: aiResult.ai_executive_summary || 'No data.'
        }
      });

      console.log(`[Pilot Auditor] Finished audit for Store ${storeId} on Day ${dayNumber}`);
      return auditRecord;

    } catch (error) {
      console.error(`[Pilot Auditor Error] Store ${storeId}:`, error);
      throw error;
    }
  }

  /**
   * Run the audit for all pilot stores.
   */
  static async runGlobalPilotAudit(targetDate?: Date) {
    const pilotStores = await prisma.store.findMany({
      where: { is_pilot: true }
    });

    const results = [];
    for (const store of pilotStores) {
      const res = await this.runDailyAudit(store.id, targetDate);
      results.push(res);
    }
    return results;
  }
}
