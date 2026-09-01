import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { emailProvider } from '@/lib/email/provider';
import { ScopeType } from '@prisma/client';

export async function GET(req: NextRequest) {
  // Simple cron token or auth check (can be bypassed for local dev trigger)
  try {
    const subscriptions = await db.reportSubscription.findMany({
      where: { enabled: true, reportType: 'DAILY_PULSE' },
      include: { user: { include: { organization: true } } },
    });

    const results = [];

    for (const sub of subscriptions) {
      const user = sub.user;
      const organizationId = user.organizationId;

      // 1. Fetch latest ranking snapshots for this organization
      const rankings = await db.rankingSnapshot.findMany({
        where: {
          organizationId,
          period: 'WEEKLY',
          rankType: 'OVERALL',
        },
        orderBy: { position: 'asc' },
      });

      // 2. Fetch location details to map names
      const locations = await db.location.findMany({
        where: { organizationId, status: 'ACTIVE' },
        select: { id: true, name: true },
      });

      const locMap = new Map(locations.map((l) => [l.id, l.name]));

      // 3. Format rankings list
      let rankingsHtml = '';
      rankings.forEach((rank) => {
        const locName = locMap.get(rank.entityId) || 'Unknown Location';
        const prev = rank.previousPosition;
        let indicator = '';
        if (prev) {
          if (rank.position < prev) indicator = '↑';
          else if (rank.position > prev) indicator = '↓';
        }
        rankingsHtml += `<li><strong>${rank.position}. ${locName}</strong> — ${rank.score.toFixed(1)} ${indicator}</li>`;
      });

      // 4. Fetch critical alerts in past 24h
      const past24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const criticalAlerts = await db.alert.findMany({
        where: {
          organizationId,
          severity: 'CRITICAL',
          detectedAt: { gte: past24h },
        },
        take: 3,
      });

      let alertsHtml = '';
      if (criticalAlerts.length > 0) {
        alertsHtml = '<h3>Critical Alerts (Past 24h)</h3><ul>';
        criticalAlerts.forEach((a) => {
          alertsHtml += `<li style="color: #ef4444;"><strong>${a.title}</strong>: ${a.description}</li>`;
        });
        alertsHtml += '</ul>';
      } else {
        alertsHtml = '<p>No critical alerts detected in the past 24 hours.</p>';
      }

      // 5. Build HTML Email Template
      const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #242838; background-color: #0a0b0d; color: #f3f4f6; border-radius: 12px;">
          <h2 style="color: #c5a880; border-bottom: 1px solid #242838; padding-bottom: 10px;">
            BRASA Brand Pulse™ Daily Executive Report
          </h2>
          <p>Olá ${user.firstName}, here is the daily reputation summary for <strong>${user.organization.name}</strong>.</p>
          
          <h3 style="color: #3b82f6;">Current Brand Pulse Rankings</h3>
          <ol style="line-height: 1.6; font-size: 16px;">
            ${rankingsHtml || '<li>No active rankings found. Seeding reviews is recommended.</li>'}
          </ol>

          ${alertsHtml}

          <div style="margin-top: 30px; border-top: 1px solid #242838; padding-top: 15px; font-size: 12px; color: #9ca3af;">
            <p>You received this email because you are subscribed to Daily Pulse reports for ${user.organization.name}.</p>
            <p>&copy; ${new Date().getFullYear()} BRASA Brand Pulse OS. All rights reserved.</p>
          </div>
        </div>
      `;

      // 6. Send email via provider
      const emailResult = await emailProvider.sendEmail({
        to: user.email,
        subject: `Daily Brand Pulse Report - ${new Date().toLocaleDateString()}`,
        html: htmlBody,
      });

      // 7. Write Report Delivery Log
      await db.reportDelivery.create({
        data: {
          subscriptionId: sub.id,
          recipient: user.email,
          subject: `Daily Brand Pulse Report - ${new Date().toLocaleDateString()}`,
          status: emailResult.success ? 'SENT' : 'FAILED',
          error: emailResult.error || null,
          sentAt: emailResult.success ? new Date() : null,
        },
      });

      results.push({ email: user.email, success: emailResult.success });
    }

    return NextResponse.json({ success: true, processedCount: subscriptions.length, details: results });
  } catch (err: any) {
    console.error('Cron daily email dispatch error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
